import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
/* ---------------- CORS (un peu mieux que "*") ---------------- */ function corsHeaders(origin) {
  const allowed = (Deno.env.get("CORS_ALLOWED_ORIGINS") ?? "").split(",").map((s)=>s.trim()).filter(Boolean);
  const allowOrigin = origin && (allowed.length === 0 || allowed.includes(origin)) ? origin : allowed[0] ?? "*";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin"
  };
}
function json(req, data, status = 200) {
  const origin = req.headers.get("origin");
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders(origin),
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}
function getBearer(req) {
  const h = req.headers.get("authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1] ?? null;
}
function envTrim(name) {
  const v = Deno.env.get(name);
  const t = typeof v === "string" ? v.trim() : "";
  return t ? t : null;
}
function isValidUuid(v) {
  if (typeof v !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}
function normalizePlan(v) {
  const p = typeof v === "string" ? v.trim().toLowerCase() : "";
  if (p === "starter" || p === "pro") return p;
  return null;
}
function planToPricing(plan) {
  if (plan === "starter") return {
    value: "15.99",
    currency: "EUR",
    interval: "1 month"
  };
  return {
    value: "25.99",
    currency: "EUR",
    interval: "1 month"
  };
}
/* ---------------- Return base url resolution (staging/prod/local) ---------------- */ function normalizeOrigin(u) {
  const url = new URL(u);
  return `${url.protocol}//${url.host}`;
}
function resolveReturnBaseUrl(req) {
  const allowed = (Deno.env.get("APP_ALLOWED_ORIGINS") ?? "").split(",").map((s)=>s.trim()).filter(Boolean).map((s)=>{
    try {
      return normalizeOrigin(s);
    } catch  {
      return "";
    }
  }).filter(Boolean);
  if (allowed.length === 0) return null;
  const origin = req.headers.get("origin");
  if (origin) {
    try {
      const o = normalizeOrigin(origin);
      if (allowed.includes(o)) return o;
    } catch  {}
  }
  const ref = req.headers.get("referer");
  if (ref) {
    try {
      const o = normalizeOrigin(ref);
      if (allowed.includes(o)) return o;
    } catch  {}
  }
  return null;
}
/* ---------------- Mollie helpers ---------------- */ async function mollieFetch(url, mollieKey, init) {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${mollieKey}`,
      "Content-Type": "application/json",
      ...init.headers ?? {}
    }
  });
  const txt = await res.text().catch(()=>"");
  let data = null;
  try {
    data = txt ? JSON.parse(txt) : null;
  } catch  {
    data = txt;
  }
  return {
    res,
    data,
    rawText: txt
  };
}
async function hasActiveMandate(mollieKey, customerId) {
  const { res, data, rawText } = await mollieFetch(`https://api.mollie.com/v2/customers/${customerId}/mandates`, mollieKey, {
    method: "GET"
  });
  if (!res.ok) {
    return {
      ok: false,
      error: "MOLLIE_LIST_MANDATES_FAILED",
      details: rawText
    };
  }
  const items = data?._embedded?.mandates ?? [];
  const active = items.some((m)=>String(m?.status ?? "").toLowerCase() === "valid");
  return {
    ok: true,
    active
  };
}
function getCheckoutHref(raw) {
  const href = raw?._links?.checkout?.href;
  return typeof href === "string" && href.trim() ? href.trim() : null;
}
async function tryCancelExistingSubscription(params) {
  const { mollieKey, customerId, subscriptionId } = params;
  const { res, rawText } = await mollieFetch(`https://api.mollie.com/v2/customers/${customerId}/subscriptions/${subscriptionId}`, mollieKey, {
    method: "DELETE"
  });
  if (res.status === 404) {
    return {
      ok: false,
      error: "MOLLIE_CANCEL_404_WRONG_CUSTOMER",
      details: rawText
    };
  }
  if (!res.ok) return {
    ok: false,
    error: "MOLLIE_CANCEL_SUB_FAILED",
    details: rawText
  };
  return {
    ok: true
  };
}
/* ---------------- Promo helpers ---------------- */ function parseCsvEnv(name) {
  return (Deno.env.get(name) ?? "").split(",").map((s)=>s.trim().toLowerCase()).filter(Boolean);
}
function getEarlyAdopterConfig() {
  const active = String(Deno.env.get("EARLY_ADOPTER_ACTIVE") ?? "").trim().toLowerCase() === "true";
  const code = String(Deno.env.get("EARLY_ADOPTER_CODE") ?? "").trim().toUpperCase();
  const percentRaw = Number(Deno.env.get("EARLY_ADOPTER_PERCENT") ?? "0");
  const percent = Number.isFinite(percentRaw) ? Math.max(0, Math.min(100, Math.trunc(percentRaw))) : 0;
  const allowedPlans = parseCsvEnv("EARLY_ADOPTER_ALLOWED_PLANS");
  return {
    active,
    code,
    percent,
    allowedPlans
  };
}
function normalizePromoCode(v) {
  if (typeof v !== "string") return null;
  const t = v.trim().toUpperCase();
  return t || null;
}
function resolvePromo(params) {
  const cfg = getEarlyAdopterConfig();
  if (!cfg.active) {
    return {
      applied: false,
      promoCode: null,
      discountPercent: 0
    };
  }
  if (!params.promoCode || !cfg.code) {
    return {
      applied: false,
      promoCode: null,
      discountPercent: 0
    };
  }
  if (params.promoCode !== cfg.code) {
    return {
      applied: false,
      promoCode: null,
      discountPercent: 0
    };
  }
  if (cfg.allowedPlans.length > 0 && !cfg.allowedPlans.includes(params.plan)) {
    return {
      applied: false,
      promoCode: null,
      discountPercent: 0
    };
  }
  return {
    applied: true,
    promoCode: cfg.code,
    discountPercent: cfg.percent
  };
}
function applyDiscount(pricing, discountPercent) {
  if (!discountPercent || discountPercent <= 0) return pricing;
  const base = Number(pricing.value);
  const finalValue = Math.max(0, base * (1 - discountPercent / 100));
  return {
    ...pricing,
    value: finalValue.toFixed(2)
  };
}
function resolvePricing(params) {
  const currentStatus = String(params.current?.status ?? "").trim().toLowerCase();
  const storedValue = params.current?.billing_price_value?.trim();
  const storedCurrency = params.current?.billing_currency?.trim() || "EUR";
  const storedDiscount = Number(params.current?.discount_percent ?? 0);
  // ✅ on ne fige vraiment le pricing que si l’abonnement est déjà actif
  const shouldReuseStoredPricing = currentStatus === "active" && Boolean(storedValue);
  if (shouldReuseStoredPricing && storedValue) {
    return {
      pricing: {
        value: storedValue,
        currency: storedCurrency,
        interval: "1 month"
      },
      promo: {
        applied: storedDiscount > 0,
        promoCode: params.current?.promo_code ?? null,
        discountPercent: storedDiscount
      },
      reusedStoredPricing: true
    };
  }
  const basePricing = planToPricing(params.plan);
  const promo = resolvePromo({
    promoCode: params.promoCode,
    plan: params.plan
  });
  const pricing = applyDiscount(basePricing, promo.discountPercent);
  return {
    pricing,
    promo,
    reusedStoredPricing: false
  };
}
/* ---------------- Handler ---------------- */ Deno.serve(async (req)=>{
  try {
    if (req.method === "OPTIONS") {
      const origin = req.headers.get("origin");
      return new Response("ok", {
        headers: corsHeaders(origin)
      });
    }
    if (req.method !== "POST") {
      return json(req, {
        error: "Method not allowed"
      }, 405);
    }
    const token = getBearer(req);
    if (!token) return json(req, {
      error: "NOT_AUTHENTICATED"
    }, 401);
    const bodyRaw = await req.json().catch(()=>null);
    const orgId = bodyRaw?.orgId;
    const plan = normalizePlan(bodyRaw?.plan);
    const promoCode = normalizePromoCode(bodyRaw?.promoCode);
    if (!isValidUuid(orgId) || !plan) {
      return json(req, {
        error: "VALIDATION_ERROR: invalid_payload"
      }, 400);
    }
    const supabaseUrl = envTrim("SUPABASE_URL");
    const serviceKey = envTrim("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = envTrim("SUPABASE_ANON_KEY");
    const mollieKey = envTrim("MOLLIE_API_KEY");
    if (!supabaseUrl || !serviceKey || !anonKey || !mollieKey) {
      return json(req, {
        error: "Server misconfigured"
      }, 500);
    }
    const returnBaseUrl = resolveReturnBaseUrl(req);
    if (!returnBaseUrl) {
      return json(req, {
        error: "ORIGIN_NOT_ALLOWED"
      }, 403);
    }
    const functionsBase = `${supabaseUrl}/functions/v1`;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });
    const service = createClient(supabaseUrl, serviceKey);
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return json(req, {
        error: "Invalid session"
      }, 401);
    }
    const userId = userData.user.id;
    const userEmail = userData.user.email ?? null;
    const { data: om, error: omErr } = await service.from("organization_members").select("role").eq("org_id", orgId).eq("user_id", userId).in("role", [
      "owner",
      "admin"
    ]).limit(1);
    if (omErr) return json(req, {
      error: "Auth check failed"
    }, 500);
    if (!om || om.length === 0) return json(req, {
      error: "FORBIDDEN"
    }, 403);
    const { data: existing, error: exErr } = await service.from("subscriptions").select(`
        status,
        plan,
        mollie_customer_id,
        mollie_subscription_id,
        current_period_end,
        promo_code,
        discount_percent,
        billing_price_value,
        billing_currency
      `).eq("org_id", orgId).maybeSingle();
    if (!exErr && existing?.status === "active" && existing?.plan === plan && existing?.mollie_subscription_id) {
      return json(req, {
        ok: true,
        action: "sub_created",
        orgId,
        plan,
        mollieCustomerId: existing.mollie_customer_id,
        mollieSubscriptionId: existing.mollie_subscription_id,
        status: existing.status,
        currentPeriodEnd: existing.current_period_end,
        reused: true
      });
    }
    const { data: intent, error: intentErr } = await userClient.rpc("create_subscription_intent", {
      p_org_id: orgId,
      p_plan: plan
    });
    if (intentErr) return json(req, {
      error: intentErr.message
    }, 400);
    const { data: latest, error: latestErr } = await service.from("subscriptions").select(`
        status,
        plan,
        mollie_customer_id,
        mollie_subscription_id,
        current_period_end,
        promo_code,
        discount_percent,
        billing_price_value,
        billing_currency
      `).eq("org_id", orgId).maybeSingle();
    if (latestErr) {
      return json(req, {
        error: "Load subscriptions after intent failed",
        details: latestErr.message
      }, 500);
    }
    const current = latest ?? existing ?? null;
    const resolved = resolvePricing({
      plan,
      promoCode,
      current
    });
    const pricing = resolved.pricing;
    const promo = resolved.promo;
    const { data: org, error: orgErr } = await service.from("organizations").select("id, name").eq("id", orgId).maybeSingle();
    if (orgErr || !org) return json(req, {
      error: "Organization not found"
    }, 404);
    let mollieCustomerId = current?.mollie_customer_id ?? intent?.mollie_customer_id ?? null;
    if (!mollieCustomerId) {
      const { res: custRes, data: custData, rawText } = await mollieFetch("https://api.mollie.com/v2/customers", mollieKey, {
        method: "POST",
        body: JSON.stringify({
          name: org.name ?? `Org ${orgId}`,
          email: userEmail,
          metadata: {
            org_id: orgId
          }
        })
      });
      if (!custRes.ok) {
        return json(req, {
          error: "Mollie create customer failed",
          details: rawText
        }, 502);
      }
      mollieCustomerId = custData?.id ?? null;
      if (!mollieCustomerId) {
        return json(req, {
          error: "Mollie customer missing id"
        }, 502);
      }
    }
    await service.from("subscriptions").update({
      mollie_customer_id: mollieCustomerId,
      promo_code: promo.applied ? promo.promoCode : null,
      discount_percent: promo.applied ? promo.discountPercent : null,
      billing_price_value: pricing.value,
      billing_currency: pricing.currency,
      updated_at: new Date().toISOString()
    }).eq("org_id", orgId);
    const existingSubId = current?.mollie_subscription_id ?? null;
    const existingPlan = current?.plan?.toLowerCase() ?? null;
    const shouldCancelExisting = Boolean(existingSubId) && Boolean(existingPlan) && existingPlan !== plan;
    if (shouldCancelExisting && existingSubId) {
      const cancelCustomerId = current?.mollie_customer_id ?? mollieCustomerId;
      const cancel = await tryCancelExistingSubscription({
        mollieKey,
        customerId: cancelCustomerId,
        subscriptionId: existingSubId
      });
      if (!cancel.ok) {
        console.error("[subscription] cancel failed", {
          orgId,
          cancelCustomerId,
          existingSubId,
          error: cancel.error,
          details: cancel.details
        });
        return json(req, {
          error: cancel.error
        }, 502);
      }
      await service.from("subscriptions").update({
        updated_at: new Date().toISOString()
      }).eq("org_id", orgId);
    }
    const mandate = await hasActiveMandate(mollieKey, mollieCustomerId);
    if (!mandate.ok) {
      return json(req, {
        error: mandate.error,
        details: mandate.details
      }, 502);
    }
    const billingReturnUrl = `${returnBaseUrl}/admin/abonnement?return=1&org=${encodeURIComponent(orgId)}`;
    const paymentWebhookUrl = `${functionsBase}/payment-first`;
    if (!mandate.active) {
      const description = `EventFlow ${plan.toUpperCase()} - ${org.name} - 1er mois`;
      const metadata = {
        org_id: orgId,
        plan,
        kind: "subscription_first"
      };
      const { res: payRes, data: payData, rawText } = await mollieFetch(`https://api.mollie.com/v2/customers/${mollieCustomerId}/payments`, mollieKey, {
        method: "POST",
        body: JSON.stringify({
          amount: {
            currency: pricing.currency,
            value: pricing.value
          },
          description,
          redirectUrl: billingReturnUrl,
          webhookUrl: paymentWebhookUrl,
          sequenceType: "first",
          method: [
            "creditcard",
            "directdebit"
          ],
          metadata
        })
      });
      if (!payRes.ok) {
        return json(req, {
          error: "Mollie create first payment failed",
          details: rawText
        }, 502);
      }
      const checkoutUrl = getCheckoutHref(payData);
      const paymentId = payData?.id ?? null;
      if (!checkoutUrl || !paymentId) {
        return json(req, {
          error: "Missing checkout url",
          details: payData
        }, 502);
      }
      return json(req, {
        ok: true,
        action: "checkout",
        orgId,
        plan,
        mollieCustomerId,
        checkoutUrl,
        paymentId,
        canceledPrevious: shouldCancelExisting,
        returnBaseUrl,
        promoApplied: promo.applied,
        discountPercent: promo.discountPercent,
        billingPriceValue: pricing.value
      });
    }
    const subWebhookUrl = `${functionsBase}/mollie-subscription-webhook`;
    const { res: subRes, data: subData, rawText } = await mollieFetch(`https://api.mollie.com/v2/customers/${mollieCustomerId}/subscriptions`, mollieKey, {
      method: "POST",
      body: JSON.stringify({
        amount: {
          currency: pricing.currency,
          value: pricing.value
        },
        interval: pricing.interval,
        description: `Eventflow ${plan.toUpperCase()} • ${org.name ?? orgId}`,
        webhookUrl: subWebhookUrl,
        metadata: {
          org_id: orgId,
          plan,
          kind: "platform_subscription"
        }
      })
    });
    if (!subRes.ok) {
      return json(req, {
        error: "Mollie create subscription failed",
        details: rawText
      }, 502);
    }
    const mollieSubscriptionId = subData?.id;
    const mollieStatus = subData?.status ?? "pending";
    const periodEnd = subData?.nextPaymentDate ? new Date(subData.nextPaymentDate).toISOString() : null;
    if (!mollieSubscriptionId) {
      return json(req, {
        error: "Mollie subscription missing id"
      }, 502);
    }
    const { data: up, error: upErr } = await service.from("subscriptions").upsert({
      org_id: orgId,
      mollie_customer_id: mollieCustomerId,
      mollie_subscription_id: mollieSubscriptionId,
      plan,
      status: String(mollieStatus ?? "pending").toLowerCase(),
      current_period_end: periodEnd,
      promo_code: promo.applied ? promo.promoCode : current?.promo_code ?? null,
      discount_percent: promo.applied ? promo.discountPercent : current?.discount_percent ?? null,
      billing_price_value: pricing.value,
      billing_currency: pricing.currency,
      updated_at: new Date().toISOString()
    }, {
      onConflict: "org_id"
    }).select(`
        org_id,
        mollie_customer_id,
        mollie_subscription_id,
        plan,
        status,
        current_period_end,
        promo_code,
        discount_percent,
        billing_price_value,
        billing_currency
      `).single();
    if (upErr) return json(req, {
      error: "DB_UPSERT_FAILED",
      details: upErr.message
    }, 500);
    if (!up?.mollie_subscription_id) {
      return json(req, {
        error: "DB_UPSERT_NO_SUB_ID",
        details: up
      }, 500);
    }
    const rawForDb = {
      ...subData,
      metadata: {
        ...subData?.metadata ?? {},
        org_id: orgId,
        plan,
        kind: "platform_subscription"
      }
    };
    const { error: applyErr } = await service.rpc("apply_subscription_state", {
      p_org_id: orgId,
      p_provider: "mollie",
      p_customer_id: mollieCustomerId,
      p_subscription_id: mollieSubscriptionId,
      p_status: mollieStatus,
      p_current_period_end: periodEnd,
      p_raw: rawForDb
    });
    if (applyErr) {
      return json(req, {
        ok: false,
        warning: "subscription_created_but_db_not_updated",
        details: applyErr.message,
        mollieCustomerId,
        mollieSubscriptionId,
        status: mollieStatus,
        canceledPrevious: shouldCancelExisting
      });
    }
    return json(req, {
      ok: true,
      action: "sub_created",
      orgId,
      plan,
      mollieCustomerId,
      mollieSubscriptionId,
      status: mollieStatus,
      currentPeriodEnd: periodEnd,
      canceledPrevious: shouldCancelExisting,
      returnBaseUrl,
      promoApplied: promo.applied,
      discountPercent: promo.discountPercent,
      billingPriceValue: pricing.value
    });
  } catch (e) {
    return json(req, {
      error: "Unexpected error",
      details: String(e)
    }, 500);
  }
});
