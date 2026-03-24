import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
/**
 * register (PUBLIC)
 * - Turnstile obligatoire (bypass DEV possible)
 * - Rate limit via RPC assert_rate_limit (DB authoritative)
 * - Crée une order intent via RPC create_order_intent
 * - Si gratuit => ok: true, status: "paid"
 * - Sinon => réutilise un paiement Mollie déjà "open/pending" (idempotence)
 *           sinon crée un paiement Mollie (Connect token org) + insert dans payments
 *
 * ✅ Ajout P0: idempotence anti double paiement
 * ✅ Ajout P1: si insert payments échoue => tentative d'annulation Mollie (best effort)
 *
 * 🔐 IMPORTANT (tokens chiffrés côté Edge) :
 * - Déchiffrement / rechiffrement = ici (Edge)
 */ const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400"
};
async function sendConfirmationEmailForOrder(opts) {
  // 1) claim (idempotence)
  const { data: claimRows, error: claimErr } = await opts.admin.rpc("claim_order_confirmation_email", {
    p_order_id: opts.orderId
  });
  if (claimErr) {
    console.error("[register] claim_order_confirmation_email failed", claimErr);
    try {
      await opts.admin.rpc("mark_order_confirmation_email_error", {
        p_order_id: opts.orderId,
        p_error: "CLAIM_FAILED"
      });
    } catch  {}
    return {
      sent: false,
      skipped: false,
      error: "CLAIM_FAILED"
    };
  }
  const claim = Array.isArray(claimRows) ? claimRows[0] : claimRows;
  // déjà envoyé / déjà claim
  if (!claim?.ok) return {
    sent: false,
    skipped: true,
    error: null
  };
  // 2) call central template (send-confirmation-mail)
  try {
    const ctrl = new AbortController();
    const t = setTimeout(()=>ctrl.abort(), 10_000);
    const res = await fetch(`${opts.functionsBase}/send-confirmation-mail-tickets`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        "x-service-token": opts.edgeServiceToken
      },
      body: JSON.stringify({
        templateId: "order_confirmation_v1",
        templateData: {
          orderId: opts.orderId
        }
      }),
      signal: ctrl.signal
    }).finally(()=>clearTimeout(t));
    const txt = await res.text().catch(()=>"");
    let j = {};
    try {
      j = txt ? JSON.parse(txt) : {};
    } catch  {
      j = {
        raw: txt.slice(0, 300)
      };
    }
    if (!res.ok || !j?.ok) {
      console.error("[register] send-confirmation-mail failed", {
        status: res.status,
        j
      });
      await opts.admin.rpc("mark_order_confirmation_email_error", {
        p_order_id: opts.orderId,
        p_error: "SEND_FAILED"
      });
      return {
        sent: false,
        skipped: false,
        error: "SEND_FAILED"
      };
    }
    // 3) mark sent
    await opts.admin.rpc("mark_order_confirmation_email_sent", {
      p_order_id: opts.orderId
    });
    return {
      sent: true,
      skipped: false,
      error: null
    };
  } catch (e) {
    console.error("[register] send-confirmation-mail exception", e);
    try {
      await opts.admin.rpc("mark_order_confirmation_email_error", {
        p_order_id: opts.orderId,
        p_error: "SEND_EXCEPTION"
      });
    } catch  {}
    return {
      sent: false,
      skipped: false,
      error: "SEND_EXCEPTION"
    };
  }
}
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}
function getClientIp(req) {
  const xff = req.headers.get("x-forwarded-for") || "";
  const ip = xff.split(",")[0]?.trim();
  return ip || "unknown";
}
function envTrim(name) {
  const v = Deno.env.get(name);
  const t = typeof v === "string" ? v.trim() : "";
  return t ? t : null;
}
async function verifyTurnstile(token, ip) {
  const secret = envTrim("TURNSTILE_SECRET_KEY");
  if (!secret) return {
    ok: false,
    error: "turnstile_secret_missing"
  };
  const form = new URLSearchParams();
  form.set("secret", secret);
  form.set("response", token);
  if (ip && ip !== "unknown") form.set("remoteip", ip);
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded"
    },
    body: form.toString()
  });
  if (!res.ok) return {
    ok: false,
    error: "turnstile_verify_failed"
  };
  const data = await res.json();
  return {
    ok: Boolean(data?.success),
    data
  };
}
function isExpired(expiresAtIso) {
  if (!expiresAtIso) return true;
  const t = Date.parse(expiresAtIso);
  if (!Number.isFinite(t)) return true;
  return t - Date.now() < 60_000;
}
/* ---------------- 🔐 Encryption helpers (AES-256-GCM, iv.ct) ---------------- */ function ub64(s) {
  return Uint8Array.from(atob(s), (c)=>c.charCodeAt(0));
}
function b64(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}
function loadEncConfig() {
  const json = (Deno.env.get("MOLLIE_TOKEN_ENC_KEYS_JSON") ?? "").trim();
  const activeKid = (Deno.env.get("MOLLIE_TOKEN_ENC_KID_ACTIVE") ?? "").trim();
  if (!json || !activeKid) throw new Error("MISSING_ENC_CONFIG");
  let keys;
  try {
    keys = JSON.parse(json);
  } catch  {
    throw new Error("BAD_ENC_KEYS_JSON");
  }
  if (!keys[activeKid]) throw new Error("ACTIVE_KID_NOT_FOUND");
  return {
    keys,
    activeKid
  };
}
async function importAesKey(base64Key) {
  const raw = ub64(base64Key);
  if (raw.byteLength !== 32) throw new Error("BAD_KEY_LENGTH");
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, [
    "encrypt",
    "decrypt"
  ]);
}
async function decryptToken(enc, key) {
  const parts = String(enc ?? "").split(".");
  if (parts.length !== 2) throw new Error("BAD_CIPHERTEXT_FORMAT");
  const iv = ub64(parts[0]);
  const ct = ub64(parts[1]);
  const pt = await crypto.subtle.decrypt({
    name: "AES-GCM",
    iv
  }, key, ct);
  return new TextDecoder().decode(pt);
}
async function encryptToken(plain, key) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({
    name: "AES-GCM",
    iv
  }, key, new TextEncoder().encode(plain));
  return `${b64(iv.buffer)}.${b64(ct)}`;
}
/* ---------------- mollie helpers ---------------- */ async function refreshMollieAccessToken(refreshToken) {
  const clientId = envTrim("MOLLIE_CONNECT_CLIENT_ID");
  const clientSecret = envTrim("MOLLIE_CONNECT_CLIENT_SECRET");
  if (!clientId || !clientSecret) return {
    ok: false,
    error: "connect_client_missing"
  };
  const res = await fetch("https://api.mollie.com/oauth2/tokens", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret
    }).toString()
  });
  const txt = await res.text().catch(()=>"");
  let j = null;
  try {
    j = JSON.parse(txt);
  } catch  {}
  if (!res.ok) return {
    ok: false,
    error: "refresh_failed",
    details: txt
  };
  const accessToken = j?.access_token;
  const newRefresh = j?.refresh_token ?? refreshToken;
  const expiresIn = Number(j?.expires_in ?? 0);
  const scope = j?.scope;
  if (!accessToken || !expiresIn) return {
    ok: false,
    error: "refresh_bad_payload",
    details: j
  };
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
  return {
    ok: true,
    accessToken,
    refreshToken: newRefresh,
    expiresAt,
    scope
  };
}
function mapRpcError(msg) {
  const m = String(msg ?? "");
  if (m.includes("EVENT_SOLD_OUT")) return {
    code: "EVENT_SOLD_OUT",
    http: 409
  };
  if (m.includes("MISSING_GATEKEEPER_PRODUCT")) return {
    code: "MISSING_GATEKEEPER_PRODUCT",
    http: 400
  };
  if (m.toLowerCase().includes("insufficient stock")) return {
    code: "SOLD_OUT",
    http: 409
  };
  if (m.toLowerCase().includes("attendees count mismatch")) return {
    code: "ATTENDEES_MISMATCH",
    http: 400
  };
  if (m.includes("EVENT_NOT_PUBLISHED")) return {
    code: "EVENT_NOT_PUBLISHED",
    http: 409
  };
  if (m.includes("EVENT_ENDED")) return {
    code: "EVENT_ENDED",
    http: 409
  };
  return {
    code: "FAILED",
    http: 400
  };
}
function toNonEmptyString(v) {
  const s = typeof v === "string" ? v.trim() : String(v ?? "").trim();
  return s ? s : null;
}
function buildBuyer(body) {
  const explicitEmail = toNonEmptyString(body.buyer?.email);
  const explicitName = toNonEmptyString(body.buyer?.name);
  const explicitPhone = toNonEmptyString(body.buyer?.phone);
  if (explicitEmail || explicitName || explicitPhone) {
    return {
      email: explicitEmail,
      name: explicitName,
      phone: explicitPhone,
      is_attendee: typeof body.buyer?.isAttendee === "boolean" ? body.buyer.isAttendee : false
    };
  }
  const legacyEmail = toNonEmptyString(body.buyerEmail);
  return {
    email: legacyEmail,
    name: null,
    phone: null,
    is_attendee: legacyEmail ? true : null
  };
}
function isValidUuid(v) {
  if (typeof v !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}
function getCheckoutUrlFromRaw(raw) {
  const href = raw?._links?.checkout?.href;
  return typeof href === "string" && href.trim() ? href.trim() : null;
}
async function tryCancelMolliePayment(accessToken, paymentId, isTest) {
  try {
    const url = `https://api.mollie.com/v2/payments/${paymentId}${isTest ? "?testmode=true" : ""}`;
    await fetch(url, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
  } catch  {
  // ignore
  }
}
function normalizeOrigin(u) {
  // garde scheme + host (+ port)
  const url = new URL(u);
  return `${url.protocol}//${url.host}`;
}
function parseAllowedOrigins() {
  const raw = envTrim("APP_ALLOWED_ORIGINS") ?? "";
  return raw.split(",").map((s)=>s.trim()).filter(Boolean).map((s)=>{
    // accepte déjà "https://x" ou "http://x:5173"
    // et jette si ce n'est pas une URL
    try {
      return normalizeOrigin(s);
    } catch  {
      return "";
    }
  }).filter(Boolean);
}
function resolveAppBaseUrlFromRequest(req) {
  const allowed = parseAllowedOrigins();
  // 1) Origin (le plus clean pour fetch/XHR)
  const origin = req.headers.get("origin");
  if (origin) {
    try {
      const o = normalizeOrigin(origin);
      if (allowed.includes(o)) return o;
    } catch  {}
  }
  // 2) Referer (si Origin absent)
  const ref = req.headers.get("referer");
  if (ref) {
    try {
      const o = normalizeOrigin(ref);
      if (allowed.includes(o)) return o;
    } catch  {}
  }
  return null;
}
function getSafeWidgetReturnUrl(raw) {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) return null;
  try {
    const u = new URL(s);
    const allowed = parseAllowedOrigins();
    const origin = `${u.protocol}//${u.host}`;
    if (!allowed.includes(origin)) return null;
    if (!u.pathname.startsWith("/widget/")) return null;
    return u.toString();
  } catch  {
    return null;
  }
}
function appendQueryParams(baseUrl, params) {
  const u = new URL(baseUrl);
  for (const [key, value] of Object.entries(params)){
    if (value != null && String(value).trim()) {
      u.searchParams.set(key, String(value));
    }
  }
  return u.toString();
}
Deno.serve(async (req)=>{
  try {
    if (req.method === "OPTIONS") return new Response("ok", {
      headers: corsHeaders
    });
    if (req.method !== "POST") return json({
      error: "Method not allowed"
    }, 405);
    const body = await req.json().catch(()=>null);
    if (!body || !isValidUuid(body.eventId)) return json({
      error: "Invalid payload"
    }, 400);
    if (!Array.isArray(body.items) || body.items.length === 0) return json({
      error: "Invalid payload"
    }, 400);
    if (!Array.isArray(body.attendees)) return json({
      error: "Invalid payload"
    }, 400);
    for (const it of body.items){
      if (!it || !isValidUuid(it.eventProductId)) return json({
        error: "Invalid payload"
      }, 400);
      const q = Number(it.quantity);
      if (!Number.isFinite(q) || q < 1 || q > 100) return json({
        error: "Invalid payload"
      }, 400);
    }
    const hasBuyer = Boolean(toNonEmptyString(body.buyer?.email) || toNonEmptyString(body.buyer?.name) || toNonEmptyString(body.buyer?.phone));
    const hasLegacy = Boolean(toNonEmptyString(body.buyerEmail));
    if (!hasBuyer && !hasLegacy) return json({
      error: "BUYER_REQUIRED"
    }, 400);
    const ip = getClientIp(req);
    if (!body.turnstileToken) return json({
      error: "Missing captcha token"
    }, 400);
    const allowBypass = envTrim("TURNSTILE_BYPASS") === "1";
    if (!(allowBypass && body.turnstileToken === "TEST_BYPASS")) {
      const captcha = await verifyTurnstile(body.turnstileToken, ip);
      if (!captcha.ok) return json({
        error: "Captcha failed"
      }, 403);
    }
    const checkoutSource = body.checkoutSource === "widget" ? "widget" : "public";
    const widgetReturnUrl = checkoutSource === "widget" ? getSafeWidgetReturnUrl(body.widgetReturnUrl) : null;
    if (checkoutSource === "widget" && !widgetReturnUrl) {
      return json({
        error: "INVALID_WIDGET_RETURN_URL"
      }, 400);
    }
    const supabaseUrl = envTrim("SUPABASE_URL");
    const serviceKey = envTrim("SUPABASE_SERVICE_ROLE_KEY");
    const functionsBase = envTrim("FUNCTIONS_URL");
    const appBaseUrl = resolveAppBaseUrlFromRequest(req) ?? envTrim("APP_BASE_URL"); // fallback “safe” si tu veux
    if (!supabaseUrl || !serviceKey || !functionsBase || !appBaseUrl) {
      console.error("[register] missing required env (or origin not allowed)");
      return json({
        error: "CONFIG_MISSING"
      }, 500);
    }
    if (!supabaseUrl || !serviceKey || !functionsBase || !appBaseUrl) {
      console.error("[register] missing required env");
      return json({
        error: "CONFIG_MISSING"
      }, 500);
    }
    const admin = createClient(supabaseUrl, serviceKey);
    // Rate limit
    const limit = Number(envTrim("REGISTER_RATE_LIMIT_PER_10MIN") ?? "50");
    const windowSeconds = 600;
    const rateLimitKey = `register:${body.eventId}:${ip}`;
    const { error: rlErr } = await admin.rpc("assert_rate_limit", {
      p_key: rateLimitKey,
      p_limit: limit,
      p_window_seconds: windowSeconds
    });
    if (rlErr) return json({
      error: "Too many requests"
    }, 429);
    // Create order intent
    const p_buyer = buildBuyer(body);
    const { data: rpcRes, error: rpcErr } = await admin.rpc("create_order_intent", {
      p_event_id: body.eventId,
      p_items: body.items.map((it)=>({
          event_product_id: it.eventProductId,
          quantity: it.quantity
        })),
      p_attendees: body.attendees.map((a)=>({
          event_product_id: a.eventProductId,
          first_name: null,
          last_name: null,
          email: null,
          phone: null,
          answers: (a.answers ?? []).map((x)=>({
              event_form_field_id: x.eventFormFieldId,
              value: x.value ?? null
            }))
        })),
      p_buyer,
      p_rate_key: rateLimitKey
    });
    if (rpcErr) {
      console.error("[register] create_order_intent rpcErr", {
        message: rpcErr.message,
        code: rpcErr.code,
        details: rpcErr.details,
        hint: rpcErr.hint
      });
      // Optionnel: renvoyer un peu plus d'infos en DEV
      const mapped = mapRpcError(rpcErr.message ?? "unknown_rpc_error");
      return json({
        error: mapped.code,
        debug: envTrim("DEBUG_ERRORS") === "1" ? {
          message: rpcErr.message,
          code: rpcErr.code,
          details: rpcErr.details
        } : undefined
      }, mapped.http);
    }
    const orderId = rpcRes?.order_id;
    const bookingToken = rpcRes?.booking_token ?? null; // ✅ NEW
    const paymentRequired = Boolean(rpcRes?.payment_required);
    const totalCents = Number(rpcRes?.total_cents ?? 0);
    const currency = rpcRes?.currency || "EUR";
    const dueNowCents = typeof rpcRes?.amount_due_now_cents === "number" ? Number(rpcRes.amount_due_now_cents) : totalCents;
    if (!orderId) return json({
      error: "Order creation failed"
    }, 500);
    // ✅ booking token required for secure /order return polling
    if (!bookingToken) return json({
      error: "BOOKING_TOKEN_MISSING"
    }, 500);
    if (!paymentRequired || totalCents === 0) {
      // 1) émettre les tickets d'abord
      const { data: issueRows, error: issueErr } = await admin.rpc("issue_order_tickets", {
        p_order_id: orderId
      });
      if (issueErr) {
        console.error("[register] issue_order_tickets failed", {
          orderId,
          message: issueErr.message,
          code: issueErr?.code,
          details: issueErr?.details,
          hint: issueErr?.hint
        });
        return json({
          error: "TICKETS_ISSUE_FAILED",
          debug: envTrim("DEBUG_ERRORS") === "1" ? {
            message: issueErr.message,
            code: issueErr?.code,
            details: issueErr?.details,
            issueRows
          } : undefined
        }, 500);
      }
      // 2) ensuite seulement envoyer le mail
      try {
        const edgeToken = envTrim("EDGE_SERVICE_TOKEN");
        if (!edgeToken) {
          console.error("[register] EDGE_SERVICE_TOKEN missing -> skip confirmation email");
        } else {
          await sendConfirmationEmailForOrder({
            admin,
            orderId,
            functionsBase,
            edgeServiceToken: edgeToken
          });
        }
      } catch (e) {
        // best effort: la commande gratuite reste valide même si l'email plante
        console.error("[register] confirmation email flow crashed (ignored)", e);
      }
      return json({
        ok: true,
        orderId,
        status: "paid",
        bookingToken
      });
    }
    if (!dueNowCents || dueNowCents <= 0) return json({
      error: "Invalid payment amount"
    }, 500);
    // org_id from event
    const { data: ev, error: evErr } = await admin.from("events").select("org_id").eq("id", body.eventId).maybeSingle();
    if (evErr || !ev?.org_id) return json({
      error: "Event not found"
    }, 404);
    const orgId = ev.org_id;
    // connect tokens (ciphertext)
    const { data: mcRows, error: mcErr } = await admin.rpc("get_org_mollie_connect_secrets", {
      p_org_id: orgId
    });
    if (checkoutSource === "widget") {
      const { data: orgPlanRow, error: orgPlanErr } = await admin.from("organizations").select("plan").eq("id", orgId).maybeSingle();
      if (orgPlanErr) {
        console.error("[register-tickets] org plan load failed", orgPlanErr);
        return json({
          error: "ORG_PLAN_LOAD_FAILED"
        }, 500);
      }
      const orgPlan = String(orgPlanRow?.plan ?? "free").trim().toLowerCase();
      if (orgPlan === "free") {
        return json({
          error: "WIDGET_NOT_AVAILABLE_FOR_FREE_PLAN"
        }, 403);
      }
    }
    const mc = Array.isArray(mcRows) ? mcRows[0] : null;
    if (mcErr) return json({
      error: "PAYMENTS_CONFIG_LOAD_FAILED"
    }, 500);
    if (!mc || mc.status !== "connected") return json({
      error: "ORG_NOT_CONNECTED"
    }, 409);
    const accessEnc = mc.access_token_enc;
    const refreshEnc = mc.refresh_token_enc;
    const kid = mc.enc_kid;
    if (!accessEnc || !refreshEnc || !kid) return json({
      error: "ORG_TOKEN_MISSING"
    }, 409);
    // decrypt
    let accessToken;
    let refreshToken;
    try {
      const { keys } = loadEncConfig();
      const keyB64 = keys[kid];
      if (!keyB64) return json({
        error: "ORG_TOKEN_KEY_NOT_FOUND"
      }, 500);
      const key = await importAesKey(keyB64);
      accessToken = await decryptToken(accessEnc, key);
      refreshToken = await decryptToken(refreshEnc, key);
    } catch (e) {
      console.error("[register] token decrypt failed", e);
      return json({
        error: "ORG_TOKEN_DECRYPT_FAILED"
      }, 500);
    }
    // refresh token if expired
    if (isExpired(mc.access_token_expires_at)) {
      const ref = await refreshMollieAccessToken(refreshToken);
      if (!ref.ok) return json({
        error: "ORG_TOKEN_REFRESH_FAILED"
      }, 502);
      accessToken = ref.accessToken;
      refreshToken = ref.refreshToken;
      // encrypt with ACTIVE key on update
      let newAccessEnc;
      let newRefreshEnc;
      let newKid;
      try {
        const { keys, activeKid } = loadEncConfig();
        newKid = activeKid;
        const key = await importAesKey(keys[activeKid]);
        newAccessEnc = await encryptToken(ref.accessToken, key);
        newRefreshEnc = await encryptToken(ref.refreshToken, key);
      } catch (e) {
        console.error("[register] token encrypt failed", e);
        return json({
          error: "ORG_TOKEN_ENCRYPT_FAILED"
        }, 500);
      }
      const { error: upErr } = await admin.rpc("update_org_mollie_tokens", {
        p_org_id: orgId,
        p_access_token_enc: newAccessEnc,
        p_refresh_token_enc: newRefreshEnc,
        p_enc_kid: newKid,
        p_enc_alg: "A256GCM",
        p_expires_at: ref.expiresAt,
        p_scopes: ref.scope ?? mc.scopes ?? null
      });
      if (upErr) {
        console.error("[register] token update failed", upErr);
        return json({
          error: "ORG_TOKEN_UPDATE_FAILED"
        }, 500);
      }
    }
    const profileId = mc.mollie_profile_id;
    if (!profileId) return json({
      error: "MOLLIE_PROFILE_MISSING"
    }, 409);
    const isTest = mc.mode === "test";
    // P0 idempotence: reuse payment open/pending
    const { data: existingPay, error: existingErr } = await admin.from("payments").select("provider_payment_id, raw, created_at").eq("order_id", orderId).eq("provider", "mollie").in("status", [
      "open",
      "pending"
    ]).eq("is_refund", false).order("created_at", {
      ascending: false
    }).limit(1).maybeSingle();
    if (!existingErr && existingPay?.provider_payment_id) {
      const existingCheckoutUrl = getCheckoutUrlFromRaw(existingPay.raw);
      if (existingCheckoutUrl) {
        return json({
          ok: true,
          orderId,
          status: "awaiting_payment",
          checkoutUrl: existingCheckoutUrl,
          amountDueNowCents: dueNowCents,
          totalCents,
          reusedPayment: true,
          bookingToken
        });
      }
    }
    // Create Mollie payment
    const webhookUrl = `${functionsBase}/mollie-webhook-tickets`;
    const redirectUrl = checkoutSource === "widget" && widgetReturnUrl ? appendQueryParams(widgetReturnUrl, {
      orderId,
      token: bookingToken,
      return: "1"
    }) : appendQueryParams(`${appBaseUrl}/order/${orderId}`, {
      return: "1",
      token: bookingToken
    });
    const mollieRes = await fetch("https://api.mollie.com/v2/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount: {
          currency,
          value: (dueNowCents / 100).toFixed(2)
        },
        description: `Order ${orderId}`,
        redirectUrl,
        webhookUrl,
        profileId,
        testmode: isTest,
        metadata: {
          order_id: orderId,
          org_id: orgId,
          booking_token: bookingToken,
          kind: dueNowCents < totalCents ? "deposit" : "full"
        }
      })
    });
    if (!mollieRes.ok) return json({
      error: "MOLLIE_PAYMENT_CREATE_FAILED"
    }, 502);
    const molliePayment = await mollieRes.json();
    const checkoutUrl = molliePayment?._links?.checkout?.href;
    const providerPaymentId = molliePayment?.id;
    if (!providerPaymentId) return json({
      error: "MISSING_PROVIDER_PAYMENT_ID"
    }, 502);
    const nowIso = new Date().toISOString();
    const { error: payInsErr } = await admin.from("payments").insert({
      order_id: orderId,
      provider: "mollie",
      provider_payment_id: providerPaymentId,
      amount_cents: dueNowCents,
      currency,
      status: "open",
      is_refund: false,
      created_at: nowIso,
      updated_at: nowIso,
      processed_at: null,
      raw: molliePayment,
      type: "payment",
      parent_payment_id: null
    });
    if (payInsErr) {
      await tryCancelMolliePayment(accessToken, providerPaymentId, isTest);
      return json({
        error: "PAYMENT_DB_INSERT_FAILED"
      }, 500);
    }
    if (!checkoutUrl) return json({
      error: "MISSING_CHECKOUT_URL"
    }, 502);
    return json({
      ok: true,
      orderId,
      status: "awaiting_payment",
      checkoutUrl,
      amountDueNowCents: dueNowCents,
      totalCents,
      reusedPayment: false,
      bookingToken
    });
  } catch (e) {
    console.error("[register] unexpected", e);
    return json({
      error: "Unexpected error"
    }, 500);
  }
});
