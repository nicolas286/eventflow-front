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
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

type JsonValue = string | number | boolean | null | { [k: string]: any } | any[];

type RegisterPayload = {
  eventId: string;
  items: Array<{ eventProductId: string; quantity: number }>;

  attendees: Array<{
    eventProductId: string;
    answers?: Array<{
      eventFormFieldId: string;
      value?: JsonValue;
    }>;
  }>;

  buyerEmail?: string;

  buyer?: {
    email?: string;
    name?: string;
    phone?: string;
    isAttendee?: boolean;
  };

  turnstileToken?: string;
};

async function sendConfirmationEmailForOrder(opts: {
  admin: ReturnType<typeof createClient>;
  orderId: string;
  functionsBase: string;
  edgeServiceToken: string;
}) {
  // 1) claim (idempotence)
  const { data: claimRows, error: claimErr } = await opts.admin.rpc("claim_order_confirmation_email", {
    p_order_id: opts.orderId,
  });

  if (claimErr) {
    console.error("[register] claim_order_confirmation_email failed", claimErr);
    try {
      await opts.admin.rpc("mark_order_confirmation_email_error", {
        p_order_id: opts.orderId,
        p_error: "CLAIM_FAILED",
      });
    } catch {}
    return { sent: false, skipped: false, error: "CLAIM_FAILED" as const };
  }

  const claim = Array.isArray(claimRows) ? claimRows[0] : claimRows;

  // déjà envoyé / déjà claim
  if (!claim?.ok) return { sent: false, skipped: true, error: null };

  // 2) call central template (send-confirmation-mail)
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10_000);

    const res = await fetch(`${opts.functionsBase}/send-confirmation-mail`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        "x-service-token": opts.edgeServiceToken,
      },
      body: JSON.stringify({
        templateId: "order_confirmation_v1",
        templateData: { orderId: opts.orderId },
      }),
      signal: ctrl.signal,
    }).finally(() => clearTimeout(t));

    const txt = await res.text().catch(() => "");
    let j: any = {};
    try {
      j = txt ? JSON.parse(txt) : {};
    } catch {
      j = { raw: txt.slice(0, 300) };
    }

    if (!res.ok || !j?.ok) {
      console.error("[register] send-confirmation-mail failed", { status: res.status, j });
      await opts.admin.rpc("mark_order_confirmation_email_error", {
        p_order_id: opts.orderId,
        p_error: "SEND_FAILED",
      });
      return { sent: false, skipped: false, error: "SEND_FAILED" as const };
    }

    // 3) mark sent
    await opts.admin.rpc("mark_order_confirmation_email_sent", { p_order_id: opts.orderId });
    return { sent: true, skipped: false, error: null };
  } catch (e) {
    console.error("[register] send-confirmation-mail exception", e);
    try {
      await opts.admin.rpc("mark_order_confirmation_email_error", {
        p_order_id: opts.orderId,
        p_error: "SEND_EXCEPTION",
      });
    } catch {}
    return { sent: false, skipped: false, error: "SEND_EXCEPTION" as const };
  }
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function getClientIp(req: Request) {
  const xff = req.headers.get("x-forwarded-for") || "";
  const ip = xff.split(",")[0]?.trim();
  return ip || "unknown";
}

function envTrim(name: string): string | null {
  const v = Deno.env.get(name);
  const t = typeof v === "string" ? v.trim() : "";
  return t ? t : null;
}

async function verifyTurnstile(token: string, ip?: string) {
  const secret = envTrim("TURNSTILE_SECRET_KEY");
  if (!secret) return { ok: false, error: "turnstile_secret_missing" };

  const form = new URLSearchParams();
  form.set("secret", secret);
  form.set("response", token);
  if (ip && ip !== "unknown") form.set("remoteip", ip);

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });

  if (!res.ok) return { ok: false, error: "turnstile_verify_failed" };
  const data = await res.json();
  return { ok: Boolean(data?.success), data };
}

function isExpired(expiresAtIso?: string | null) {
  if (!expiresAtIso) return true;
  const t = Date.parse(expiresAtIso);
  if (!Number.isFinite(t)) return true;
  return t - Date.now() < 60_000;
}

/* ---------------- 🔐 Encryption helpers (AES-256-GCM, iv.ct) ---------------- */

function ub64(s: string) {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}
function b64(bytes: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

function loadEncConfig() {
  const json = (Deno.env.get("MOLLIE_TOKEN_ENC_KEYS_JSON") ?? "").trim();
  const activeKid = (Deno.env.get("MOLLIE_TOKEN_ENC_KID_ACTIVE") ?? "").trim();
  if (!json || !activeKid) throw new Error("MISSING_ENC_CONFIG");

  let keys: Record<string, string>;
  try {
    keys = JSON.parse(json);
  } catch {
    throw new Error("BAD_ENC_KEYS_JSON");
  }
  if (!keys[activeKid]) throw new Error("ACTIVE_KID_NOT_FOUND");

  return { keys, activeKid };
}

async function importAesKey(base64Key: string) {
  const raw = ub64(base64Key);
  if (raw.byteLength !== 32) throw new Error("BAD_KEY_LENGTH");
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function decryptToken(enc: string, key: CryptoKey) {
  const parts = String(enc ?? "").split(".");
  if (parts.length !== 2) throw new Error("BAD_CIPHERTEXT_FORMAT");
  const iv = ub64(parts[0]);
  const ct = ub64(parts[1]);

  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return new TextDecoder().decode(pt);
}

async function encryptToken(plain: string, key: CryptoKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain));
  return `${b64(iv.buffer)}.${b64(ct)}`;
}

/* ---------------- mollie helpers ---------------- */

async function refreshMollieAccessToken(refreshToken: string) {
  const clientId = envTrim("MOLLIE_CONNECT_CLIENT_ID");
  const clientSecret = envTrim("MOLLIE_CONNECT_CLIENT_SECRET");
  if (!clientId || !clientSecret) return { ok: false as const, error: "connect_client_missing" };

  const res = await fetch("https://api.mollie.com/oauth2/tokens", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }).toString(),
  });

  const txt = await res.text().catch(() => "");
  let j: any = null;
  try {
    j = JSON.parse(txt);
  } catch {}

  if (!res.ok) return { ok: false as const, error: "refresh_failed", details: txt };

  const accessToken = j?.access_token as string | undefined;
  const newRefresh = (j?.refresh_token as string | undefined) ?? refreshToken;
  const expiresIn = Number(j?.expires_in ?? 0);
  const scope = j?.scope as string | undefined;

  if (!accessToken || !expiresIn) return { ok: false as const, error: "refresh_bad_payload", details: j };

  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
  return { ok: true as const, accessToken, refreshToken: newRefresh, expiresAt, scope };
}

function mapRpcError(msg: string) {
  const m = String(msg ?? "");
  if (m.includes("EVENT_SOLD_OUT")) return { code: "EVENT_SOLD_OUT", http: 409 };
  if (m.includes("MISSING_GATEKEEPER_PRODUCT")) return { code: "MISSING_GATEKEEPER_PRODUCT", http: 400 };
  if (m.toLowerCase().includes("insufficient stock")) return { code: "SOLD_OUT", http: 409 };
  if (m.toLowerCase().includes("attendees count mismatch")) return { code: "ATTENDEES_MISMATCH", http: 400 };
  if (m.includes("EVENT_NOT_PUBLISHED")) return { code: "EVENT_NOT_PUBLISHED", http: 409 };
  if (m.includes("EVENT_ENDED")) return { code: "EVENT_ENDED", http: 409 };
  return { code: "FAILED", http: 400 };
}

function toNonEmptyString(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : String(v ?? "").trim();
  return s ? s : null;
}

function buildBuyer(body: RegisterPayload) {
  const explicitEmail = toNonEmptyString(body.buyer?.email);
  const explicitName = toNonEmptyString(body.buyer?.name);
  const explicitPhone = toNonEmptyString(body.buyer?.phone);

  if (explicitEmail || explicitName || explicitPhone) {
    return {
      email: explicitEmail,
      name: explicitName,
      phone: explicitPhone,
      is_attendee: typeof body.buyer?.isAttendee === "boolean" ? body.buyer.isAttendee : false,
    };
  }

  const legacyEmail = toNonEmptyString(body.buyerEmail);

  return {
    email: legacyEmail,
    name: null,
    phone: null,
    is_attendee: legacyEmail ? true : null,
  };
}

function isValidUuid(v: unknown): boolean {
  if (typeof v !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function getCheckoutUrlFromRaw(raw: any): string | null {
  const href = raw?._links?.checkout?.href;
  return typeof href === "string" && href.trim() ? href.trim() : null;
}

async function tryCancelMolliePayment(accessToken: string, paymentId: string, isTest: boolean) {
  try {
    const url = `https://api.mollie.com/v2/payments/${paymentId}${isTest ? "?testmode=true" : ""}`;
    await fetch(url, { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } });
  } catch {
    // ignore
  }
}

function normalizeOrigin(u: string) {
  // garde scheme + host (+ port)
  const url = new URL(u);
  return `${url.protocol}//${url.host}`;
}

function parseAllowedOrigins(): string[] {
  const raw = envTrim("APP_ALLOWED_ORIGINS") ?? "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      // accepte déjà "https://x" ou "http://x:5173"
      // et jette si ce n'est pas une URL
      try { return normalizeOrigin(s); } catch { return ""; }
    })
    .filter(Boolean);
}

function resolveAppBaseUrlFromRequest(req: Request): string | null {
  const allowed = parseAllowedOrigins();

  // 1) Origin (le plus clean pour fetch/XHR)
  const origin = req.headers.get("origin");
  if (origin) {
    try {
      const o = normalizeOrigin(origin);
      if (allowed.includes(o)) return o;
    } catch {}
  }

  // 2) Referer (si Origin absent)
  const ref = req.headers.get("referer");
  if (ref) {
    try {
      const o = normalizeOrigin(ref);
      if (allowed.includes(o)) return o;
    } catch {}
  }

  return null;
}


Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const body = (await req.json().catch(() => null)) as RegisterPayload | null;

    if (!body || !isValidUuid(body.eventId)) return json({ error: "Invalid payload" }, 400);
    if (!Array.isArray(body.items) || body.items.length === 0) return json({ error: "Invalid payload" }, 400);
    if (!Array.isArray(body.attendees)) return json({ error: "Invalid payload" }, 400);

    for (const it of body.items) {
      if (!it || !isValidUuid(it.eventProductId)) return json({ error: "Invalid payload" }, 400);
      const q = Number(it.quantity);
      if (!Number.isFinite(q) || q < 1 || q > 100) return json({ error: "Invalid payload" }, 400);
    }

    const hasBuyer = Boolean(
      toNonEmptyString(body.buyer?.email) || toNonEmptyString(body.buyer?.name) || toNonEmptyString(body.buyer?.phone),
    );
    const hasLegacy = Boolean(toNonEmptyString(body.buyerEmail));
    if (!hasBuyer && !hasLegacy) return json({ error: "BUYER_REQUIRED" }, 400);

    const ip = getClientIp(req);

    if (!body.turnstileToken) return json({ error: "Missing captcha token" }, 400);

    const allowBypass = envTrim("TURNSTILE_BYPASS") === "1";
    if (!(allowBypass && body.turnstileToken === "TEST_BYPASS")) {
      const captcha = await verifyTurnstile(body.turnstileToken, ip);
      if (!captcha.ok) return json({ error: "Captcha failed" }, 403);
    }

    const supabaseUrl = envTrim("SUPABASE_URL");
    const serviceKey = envTrim("SUPABASE_SERVICE_ROLE_KEY");
    const functionsBase = envTrim("FUNCTIONS_URL");
    const appBaseUrl =
    resolveAppBaseUrlFromRequest(req) ??
    envTrim("APP_BASE_URL"); // fallback “safe” si tu veux

  if (!supabaseUrl || !serviceKey || !functionsBase || !appBaseUrl) {
    console.error("[register] missing required env (or origin not allowed)");
    return json({ error: "CONFIG_MISSING" }, 500);
  }


    if (!supabaseUrl || !serviceKey || !functionsBase || !appBaseUrl) {
      console.error("[register] missing required env");
      return json({ error: "CONFIG_MISSING" }, 500);
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Rate limit
    const limit = Number(envTrim("REGISTER_RATE_LIMIT_PER_10MIN") ?? "50");
    const windowSeconds = 600;
    const rateLimitKey = `register:${body.eventId}:${ip}`;

    const { error: rlErr } = await admin.rpc("assert_rate_limit", {
      p_key: rateLimitKey,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (rlErr) return json({ error: "Too many requests" }, 429);

    // Create order intent
    const p_buyer = buildBuyer(body);

    const { data: rpcRes, error: rpcErr } = await admin.rpc("create_order_intent", {
      p_event_id: body.eventId,
      p_items: body.items.map((it) => ({ event_product_id: it.eventProductId, quantity: it.quantity })),
      p_attendees: body.attendees.map((a) => ({
        event_product_id: a.eventProductId,
        first_name: null,
        last_name: null,
        email: null,
        phone: null,
        answers: (a.answers ?? []).map((x) => ({
          event_form_field_id: x.eventFormFieldId,
          value: x.value ?? null,
        })),
      })),
      p_buyer,
      p_rate_key: rateLimitKey,
    });

    if (rpcErr) {
  console.error("[register] create_order_intent rpcErr", {
    message: rpcErr.message,
    code: (rpcErr as any).code,
    details: (rpcErr as any).details,
    hint: (rpcErr as any).hint,
  });

  // Optionnel: renvoyer un peu plus d'infos en DEV
  const mapped = mapRpcError(rpcErr.message ?? "unknown_rpc_error");
  return json(
    {
      error: mapped.code,
      debug: envTrim("DEBUG_ERRORS") === "1"
        ? { message: rpcErr.message, code: (rpcErr as any).code, details: (rpcErr as any).details }
        : undefined,
    },
    mapped.http
  );
}


    const orderId = rpcRes?.order_id as string | undefined;
    const bookingToken = (rpcRes?.booking_token as string | null) ?? null; // ✅ NEW
    const paymentRequired = Boolean(rpcRes?.payment_required);
    const totalCents = Number(rpcRes?.total_cents ?? 0);
    const currency = (rpcRes?.currency as string) || "EUR";
    const dueNowCents =
      typeof rpcRes?.amount_due_now_cents === "number" ? Number(rpcRes.amount_due_now_cents) : totalCents;

    if (!orderId) return json({ error: "Order creation failed" }, 500);

    // ✅ booking token required for secure /order return polling
    if (!bookingToken) return json({ error: "BOOKING_TOKEN_MISSING" }, 500);

    if (!paymentRequired || totalCents === 0) {
  // 🔐 trigger email confirmation (idempotent via claim rpc)
  try {
    const edgeToken = envTrim("EDGE_SERVICE_TOKEN");
    if (!edgeToken) {
      console.error("[register] EDGE_SERVICE_TOKEN missing -> skip confirmation email");
    } else {
      await sendConfirmationEmailForOrder({
      admin,
      orderId,
      functionsBase,
      edgeServiceToken: edgeToken,
    });
    }
  } catch (e) {
    // best effort: ne bloque jamais une inscription gratuite
    console.error("[register] confirmation email flow crashed (ignored)", e);
  }

  return json({ ok: true, orderId, status: "paid", bookingToken });
}


    if (!dueNowCents || dueNowCents <= 0) return json({ error: "Invalid payment amount" }, 500);

    // org_id from event
    const { data: ev, error: evErr } = await admin.from("events").select("org_id").eq("id", body.eventId).maybeSingle();
    if (evErr || !ev?.org_id) return json({ error: "Event not found" }, 404);
    const orgId = ev.org_id as string;

    // connect tokens (ciphertext)
    const { data: mcRows, error: mcErr } = await admin.rpc("get_org_mollie_connect_secrets", {
      p_org_id: orgId,
    });

    const mc = Array.isArray(mcRows) ? mcRows[0] : null;

    if (mcErr) return json({ error: "PAYMENTS_CONFIG_LOAD_FAILED" }, 500);
    if (!mc || (mc as any).status !== "connected") return json({ error: "ORG_NOT_CONNECTED" }, 409);

    const accessEnc = (mc as any).access_token_enc as string | null;
    const refreshEnc = (mc as any).refresh_token_enc as string | null;
    const kid = (mc as any).enc_kid as string | null;

    if (!accessEnc || !refreshEnc || !kid) return json({ error: "ORG_TOKEN_MISSING" }, 409);

    // decrypt
    let accessToken: string;
    let refreshToken: string;

    try {
      const { keys } = loadEncConfig();
      const keyB64 = keys[kid];
      if (!keyB64) return json({ error: "ORG_TOKEN_KEY_NOT_FOUND" }, 500);
      const key = await importAesKey(keyB64);
      accessToken = await decryptToken(accessEnc, key);
      refreshToken = await decryptToken(refreshEnc, key);
    } catch (e) {
      console.error("[register] token decrypt failed", e);
      return json({ error: "ORG_TOKEN_DECRYPT_FAILED" }, 500);
    }

    // refresh token if expired
    if (isExpired((mc as any).access_token_expires_at as string | null)) {
      const ref = await refreshMollieAccessToken(refreshToken);
      if (!ref.ok) return json({ error: "ORG_TOKEN_REFRESH_FAILED" }, 502);

      accessToken = ref.accessToken;
      refreshToken = ref.refreshToken;

      // encrypt with ACTIVE key on update
      let newAccessEnc: string;
      let newRefreshEnc: string;
      let newKid: string;

      try {
        const { keys, activeKid } = loadEncConfig();
        newKid = activeKid;
        const key = await importAesKey(keys[activeKid]);
        newAccessEnc = await encryptToken(ref.accessToken, key);
        newRefreshEnc = await encryptToken(ref.refreshToken, key);
      } catch (e) {
        console.error("[register] token encrypt failed", e);
        return json({ error: "ORG_TOKEN_ENCRYPT_FAILED" }, 500);
      }

      const { error: upErr } = await admin.rpc("update_org_mollie_tokens", {
        p_org_id: orgId,
        p_access_token_enc: newAccessEnc,
        p_refresh_token_enc: newRefreshEnc,
        p_enc_kid: newKid,
        p_enc_alg: "A256GCM",
        p_expires_at: ref.expiresAt,
        p_scopes: ref.scope ?? (mc as any).scopes ?? null,
      });

      if (upErr) {
        console.error("[register] token update failed", upErr);
        return json({ error: "ORG_TOKEN_UPDATE_FAILED" }, 500);
      }
    }

    const profileId = (mc as any).mollie_profile_id as string | null;
    if (!profileId) return json({ error: "MOLLIE_PROFILE_MISSING" }, 409);

    const isTest = (mc as any).mode === "test";

    // P0 idempotence: reuse payment open/pending
    const { data: existingPay, error: existingErr } = await admin
      .from("payments")
      .select("provider_payment_id, raw, created_at")
      .eq("order_id", orderId)
      .eq("provider", "mollie")
      .in("status", ["open", "pending"])
      .eq("is_refund", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!existingErr && existingPay?.provider_payment_id) {
      const existingCheckoutUrl = getCheckoutUrlFromRaw((existingPay as any).raw);
      if (existingCheckoutUrl) {
        return json({
          ok: true,
          orderId,
          status: "awaiting_payment",
          checkoutUrl: existingCheckoutUrl,
          amountDueNowCents: dueNowCents,
          totalCents,
          reusedPayment: true,
          bookingToken, // ✅ NEW (handy)
        });
      }
    }

    // Create Mollie payment
    const webhookUrl = `${functionsBase}/mollie-webhook`;

    // ✅ NEW: include booking token for secure return page polling
    const redirectUrl =
      `${appBaseUrl}/order/${orderId}?return=1&token=${encodeURIComponent(bookingToken)}`;

    const mollieRes = await fetch("https://api.mollie.com/v2/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: { currency, value: (dueNowCents / 100).toFixed(2) },
        description: `Order ${orderId}`,
        redirectUrl,
        webhookUrl,
        profileId,
        testmode: isTest,
        metadata: {
          order_id: orderId,
          org_id: orgId,
          booking_token: bookingToken, // ✅ optional but useful for debugging
          kind: dueNowCents < totalCents ? "deposit" : "full",
        },
      }),
    });

    if (!mollieRes.ok) return json({ error: "MOLLIE_PAYMENT_CREATE_FAILED" }, 502);

    const molliePayment = await mollieRes.json();
    const checkoutUrl = molliePayment?._links?.checkout?.href;
    const providerPaymentId = molliePayment?.id;
    if (!providerPaymentId) return json({ error: "MISSING_PROVIDER_PAYMENT_ID" }, 502);

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
      parent_payment_id: null,
    });

    if (payInsErr) {
      await tryCancelMolliePayment(accessToken, providerPaymentId, isTest);
      return json({ error: "PAYMENT_DB_INSERT_FAILED" }, 500);
    }

    if (!checkoutUrl) return json({ error: "MISSING_CHECKOUT_URL" }, 502);

    return json({
      ok: true,
      orderId,
      status: "awaiting_payment",
      checkoutUrl,
      amountDueNowCents: dueNowCents,
      totalCents,
      reusedPayment: false,
      bookingToken, // ✅ NEW
    });
  } catch (e) {
    console.error("[register] unexpected", e);
    return json({ error: "Unexpected error" }, 500);
  }
});
