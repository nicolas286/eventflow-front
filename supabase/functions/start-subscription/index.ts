import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ---------------- CORS (un peu mieux que "*") ---------------- */

function corsHeaders(origin: string | null) {
  const allowed = (Deno.env.get("CORS_ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const allowOrigin =
    origin && (allowed.length === 0 || allowed.includes(origin))
      ? origin
      : (allowed[0] ?? "*");

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(req: Request, data: unknown, status = 200) {
  const origin = req.headers.get("origin");
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders(origin),
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function getBearer(req: Request) {
  const h = req.headers.get("authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1] ?? null;
}

function envTrim(name: string): string | null {
  const v = Deno.env.get(name);
  const t = typeof v === "string" ? v.trim() : "";
  return t ? t : null;
}

function isValidUuid(v: unknown): boolean {
  if (typeof v !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

type PlanKey = "starter" | "pro";

function normalizePlan(v: unknown): PlanKey | null {
  const p = typeof v === "string" ? v.trim().toLowerCase() : "";
  if (p === "starter" || p === "pro") return p;
  return null;
}

function planToPricing(plan: PlanKey) {
  // IMPORTANT: Mollie attend string "12.34"
  if (plan === "starter") return { value: "15.99", currency: "EUR", interval: "1 month" as const };
  return { value: "25.99", currency: "EUR", interval: "1 month" as const };
}

/* ---------------- Return base url resolution (staging/prod/local) ---------------- */

function normalizeOrigin(u: string) {
  const url = new URL(u);
  return `${url.protocol}//${url.host}`;
}

function resolveReturnBaseUrl(req: Request): string | null {
  // liste d’origins autorisées pour les redirects de billing
  // ex: "http://localhost:5173,https://staging.eventflow.be,https://eventflow.be"
  const allowed = (Deno.env.get("APP_ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      try {
        return normalizeOrigin(s);
      } catch {
        return "";
      }
    })
    .filter(Boolean);

  // si tu as oublié l’env, on refuse (sinon open redirect)
  if (allowed.length === 0) return null;

  const origin = req.headers.get("origin");
  if (origin) {
    try {
      const o = normalizeOrigin(origin);
      if (allowed.includes(o)) return o;
    } catch {}
  }

  const ref = req.headers.get("referer");
  if (ref) {
    try {
      const o = normalizeOrigin(ref);
      if (allowed.includes(o)) return o;
    } catch {}
  }

  return null;
}

/* ---------------- Mollie helpers ---------------- */

async function mollieFetch(url: string, mollieKey: string, init: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${mollieKey}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  const txt = await res.text().catch(() => "");
  let data: any = null;
  try {
    data = txt ? JSON.parse(txt) : null;
  } catch {
    data = txt;
  }

  return { res, data, rawText: txt };
}

async function hasActiveMandate(mollieKey: string, customerId: string) {
  const { res, data, rawText } = await mollieFetch(
    `https://api.mollie.com/v2/customers/${customerId}/mandates`,
    mollieKey,
    { method: "GET" },
  );

  if (!res.ok) {
    return { ok: false as const, error: "MOLLIE_LIST_MANDATES_FAILED", details: rawText };
  }

  const items: any[] = data?._embedded?.mandates ?? [];
  const active = items.some((m) => String(m?.status ?? "").toLowerCase() === "valid");
  return { ok: true as const, active };
}

function getCheckoutHref(raw: any): string | null {
  const href = raw?._links?.checkout?.href;
  return typeof href === "string" && href.trim() ? href.trim() : null;
}

async function tryCancelExistingSubscription(params: {
  mollieKey: string;
  customerId: string;
  subscriptionId: string;
}) {
  const { mollieKey, customerId, subscriptionId } = params;

  const { res, rawText } = await mollieFetch(
    `https://api.mollie.com/v2/customers/${customerId}/subscriptions/${subscriptionId}`,
    mollieKey,
    { method: "DELETE" },
  );

  // ✅ IMPORTANT: 404 is NOT "already gone" in upgrade flow: it's very often "wrong customerId"
  if (res.status === 404) {
    return { ok: false as const, error: "MOLLIE_CANCEL_404_WRONG_CUSTOMER", details: rawText };
  }

  if (!res.ok) return { ok: false as const, error: "MOLLIE_CANCEL_SUB_FAILED", details: rawText };
  return { ok: true as const };
}

/* ---------------- Handler ---------------- */

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      const origin = req.headers.get("origin");
      return new Response("ok", { headers: corsHeaders(origin) });
    }
    if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

    const token = getBearer(req);
    if (!token) return json(req, { error: "NOT_AUTHENTICATED" }, 401);

    const bodyRaw = (await req.json().catch(() => null)) as any;
    const orgId = bodyRaw?.orgId;
    const plan = normalizePlan(bodyRaw?.plan);

    if (!isValidUuid(orgId) || !plan) {
      return json(req, { error: "VALIDATION_ERROR: invalid_payload" }, 400);
    }

    const supabaseUrl = envTrim("SUPABASE_URL");
    const serviceKey = envTrim("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = envTrim("SUPABASE_ANON_KEY");
    const mollieKey = envTrim("MOLLIE_API_KEY");

    if (!supabaseUrl || !serviceKey || !anonKey || !mollieKey) {
      return json(req, { error: "Server misconfigured" }, 500);
    }

    // ✅ IMPORTANT: derive correct base url (staging/prod/local) from request
    const returnBaseUrl = resolveReturnBaseUrl(req);
    if (!returnBaseUrl) {
      return json(req, { error: "ORIGIN_NOT_ALLOWED" }, 403);
    }

    const functionsBase = `${supabaseUrl}/functions/v1`;
    const pricing = planToPricing(plan);

    // 1) Validate JWT
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const service = createClient(supabaseUrl, serviceKey); // <-- NO JWT header

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json(req, { error: "Invalid session" }, 401);

    const userId = userData.user.id;
    const userEmail = userData.user.email ?? null;

    // 3) AuthZ owner/admin on org
    const { data: om, error: omErr } = await service
      .from("organization_members")
      .select("role")
      .eq("org_id", orgId)
      .eq("user_id", userId)
      .in("role", ["owner", "admin"])
      .limit(1);

    if (omErr) return json(req, { error: "Auth check failed" }, 500);
    if (!om || om.length === 0) return json(req, { error: "FORBIDDEN" }, 403);

    // 4) Load current subscription row
    const { data: existing, error: exErr } = await service
      .from("subscriptions")
      .select("status, plan, mollie_customer_id, mollie_subscription_id, current_period_end")
      .eq("org_id", orgId)
      .maybeSingle();

    // 4A) strict idempotence: active + same plan + sub_id -> noop
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
        reused: true,
      });
    }

    // 5) RPC intent (sets status=pending + requested plan, etc.)
    const { data: intent, error: intentErr } = await userClient.rpc("create_subscription_intent", {
      p_org_id: orgId,
      p_plan: plan,
    });

    if (intentErr) return json(req, { error: intentErr.message }, 400);

    // ✅ reload after intent
    const { data: latest, error: latestErr } = await service
      .from("subscriptions")
      .select("status, plan, mollie_customer_id, mollie_subscription_id, current_period_end")
      .eq("org_id", orgId)
      .maybeSingle();

    if (latestErr) return json(req, { error: "Load subscriptions after intent failed", details: latestErr.message }, 500);

    const current = latest ?? existing ?? null;

    // 6) org name (customer label)
    const { data: org, error: orgErr } = await service
      .from("organizations")
      .select("id, name")
      .eq("id", orgId)
      .maybeSingle();

    if (orgErr || !org) return json(req, { error: "Organization not found" }, 404);

    // 7) Choose customerId (upgrade-safe): prioritize existing DB
    let mollieCustomerId =
      (current?.mollie_customer_id as string | null) ??
      ((intent as any)?.mollie_customer_id as string | null) ??
      null;

    if (!mollieCustomerId) {
      const { res: custRes, data: custData, rawText } = await mollieFetch(
        "https://api.mollie.com/v2/customers",
        mollieKey,
        {
          method: "POST",
          body: JSON.stringify({
            name: org.name ?? `Org ${orgId}`,
            email: userEmail,
            metadata: { org_id: orgId },
          }),
        },
      );

      if (!custRes.ok) return json(req, { error: "Mollie create customer failed", details: rawText }, 502);

      mollieCustomerId = custData?.id ?? null;
      if (!mollieCustomerId) return json(req, { error: "Mollie customer missing id" }, 502);
    }

    // Persist customer_id (best effort)
    await service
      .from("subscriptions")
      .update({ mollie_customer_id: mollieCustomerId, updated_at: new Date().toISOString() })
      .eq("org_id", orgId);

    // 8) Upgrade path: cancel old subscription if plan differs
    const existingSubId = (current?.mollie_subscription_id as string | null) ?? null;
    const existingPlan = (current?.plan as string | null)?.toLowerCase() ?? null;

    const shouldCancelExisting = Boolean(existingSubId) && Boolean(existingPlan) && existingPlan !== plan;

    if (shouldCancelExisting && existingSubId) {
      const cancelCustomerId = ((current?.mollie_customer_id as string | null) ?? mollieCustomerId)!;

      const cancel = await tryCancelExistingSubscription({
        mollieKey,
        customerId: cancelCustomerId,
        subscriptionId: existingSubId,
      });

      if (!cancel.ok) {
        console.error("[subscription] cancel failed", {
          orgId,
          cancelCustomerId,
          existingSubId,
          error: cancel.error,
          details: cancel.details,
        });
        return json(req, { error: cancel.error }, 502);
      }

      await service
        .from("subscriptions")
        .update({ updated_at: new Date().toISOString() })
        .eq("org_id", orgId);
    }

    // 9) Mandate check
    const mandate = await hasActiveMandate(mollieKey, mollieCustomerId);
    if (!mandate.ok) return json(req, { error: mandate.error, details: mandate.details }, 502);

    // ✅ FIX: redirectUrl must be based on origin (not APP_BASE_URL)
    const billingReturnUrl = `${returnBaseUrl}/admin/abonnement?return=1&org=${encodeURIComponent(orgId)}`;
    const paymentWebhookUrl = `${functionsBase}/payment-first`;

    if (!mandate.active) {
      // 10A) No mandate => first payment checkout to create mandate
      const description = `EventFlow ${plan.toUpperCase()} - ${org.name} - 1er mois`;
      const metadata = { org_id: orgId, plan, kind: "subscription_first" };

      const { res: payRes, data: payData, rawText } = await mollieFetch(
        `https://api.mollie.com/v2/customers/${mollieCustomerId}/payments`,
        mollieKey,
        {
          method: "POST",
          body: JSON.stringify({
            amount: { currency: pricing.currency, value: pricing.value },
            description,
            redirectUrl: billingReturnUrl,
            webhookUrl: paymentWebhookUrl,
            sequenceType: "first",
            method: ["creditcard", "directdebit"],
            metadata,
          }),
        },
      );

      if (!payRes.ok) return json(req, { error: "Mollie create first payment failed", details: rawText }, 502);

      const checkoutUrl = getCheckoutHref(payData);
      const paymentId = payData?.id ?? null;
      if (!checkoutUrl || !paymentId) return json(req, { error: "Missing checkout url", details: payData }, 502);

      return json(req, {
        ok: true,
        action: "checkout",
        orgId,
        plan,
        mollieCustomerId,
        checkoutUrl,
        paymentId,
        canceledPrevious: shouldCancelExisting,
        returnBaseUrl, // debug utile
      });
    }

    // 10B) Mandate OK => create subscription immediately
    const subWebhookUrl = `${functionsBase}/mollie-subscription-webhook`;

    const { res: subRes, data: subData, rawText } = await mollieFetch(
      `https://api.mollie.com/v2/customers/${mollieCustomerId}/subscriptions`,
      mollieKey,
      {
        method: "POST",
        body: JSON.stringify({
          amount: { currency: pricing.currency, value: pricing.value },
          interval: pricing.interval,
          description: `Eventflow ${plan.toUpperCase()} • ${org.name ?? orgId}`,
          webhookUrl: subWebhookUrl,
          metadata: { org_id: orgId, plan, kind: "platform_subscription" },
        }),
      },
    );

    if (!subRes.ok) return json(req, { error: "Mollie create subscription failed", details: rawText }, 502);

    const mollieSubscriptionId = subData?.id as string | undefined;
    const mollieStatus = (subData?.status as string | undefined) ?? "pending";
    const periodEnd = subData?.nextPaymentDate ? new Date(subData.nextPaymentDate).toISOString() : null;

    if (!mollieSubscriptionId) return json(req, { error: "Mollie subscription missing id" }, 502);

    const { data: up, error: upErr } = await service
      .from("subscriptions")
      .upsert(
        {
          org_id: orgId,
          mollie_customer_id: mollieCustomerId,
          mollie_subscription_id: mollieSubscriptionId,
          plan,
          status: String(mollieStatus ?? "pending").toLowerCase(),
          current_period_end: periodEnd,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "org_id" },
      )
      .select("org_id, mollie_customer_id, mollie_subscription_id, plan, status, current_period_end")
      .single();

    if (upErr) return json(req, { error: "DB_UPSERT_FAILED", details: upErr.message }, 500);
    if (!up?.mollie_subscription_id) return json(req, { error: "DB_UPSERT_NO_SUB_ID", details: up }, 500);

    const rawForDb = {
      ...subData,
      metadata: {
        ...(subData?.metadata ?? {}),
        org_id: orgId,
        plan,
        kind: "platform_subscription",
      },
    };

    const { error: applyErr } = await service.rpc("apply_subscription_state", {
      p_org_id: orgId,
      p_provider: "mollie",
      p_customer_id: mollieCustomerId,
      p_subscription_id: mollieSubscriptionId,
      p_status: mollieStatus,
      p_current_period_end: periodEnd,
      p_raw: rawForDb,
    });

    if (applyErr) {
      return json(req, {
        ok: false,
        warning: "subscription_created_but_db_not_updated",
        details: applyErr.message,
        mollieCustomerId,
        mollieSubscriptionId,
        status: mollieStatus,
        canceledPrevious: shouldCancelExisting,
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
      returnBaseUrl, // debug utile
    });
  } catch (e) {
    return json(req, { error: "Unexpected error", details: String(e) }, 500);
  }
});
