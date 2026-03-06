// supabase/functions/admin-register/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import crypto from "node:crypto";

/**
 * admin-register (AuthZ via RPC is_org_member)
 * - dashboard orga (utilisateur authentifié)
 * - create_order_intent
 * - optionnel: apply_order_payment en offline
 *
 * ✅ Réponses UNIFIÉES (important pour Zod côté front) :
 * Success: { ok:true, orderId, currency, totalCents, status, dueNowCents, bookingToken, expiresAt, amountAppliedCents?, payment? }
 * Error:   { ok:false, error, details? }
 */

/* ---------------- CORS ---------------- */

function parseAllowedOrigins(): string[] {
  const raw = (Deno.env.get("ALLOWED_ORIGINS") || "").trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function corsHeadersFor(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowed = parseAllowedOrigins();

  // Pas configuré -> permissif
  if (allowed.length === 0) {
    return {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Max-Age": "86400",
    };
  }

  if (!origin) {
    return {
      "Access-Control-Allow-Origin": allowed[0],
      "Vary": "Origin",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Max-Age": "86400",
    };
  }

  if (!allowed.includes(origin)) return null;

  return {
    "Access-Control-Allow-Origin": origin,
    "Vary": "Origin",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}

function json(data: unknown, status = 200, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function jsonErr(
  corsHeaders: Record<string, string>,
  status: number,
  error: string,
  details?: unknown,
) {
  return json({ ok: false, error, ...(details !== undefined ? { details } : {}) }, status, corsHeaders);
}

function jsonOk(
  corsHeaders: Record<string, string>,
  payload: {
    orderId: string;
    currency: string;
    totalCents: number;
    status: string;
    dueNowCents: number | null;
    bookingToken: string | null;
    expiresAt: string | null;
    amountAppliedCents?: number | null;
    payment?: unknown | null;
  },
) {
  return json({ ok: true, ...payload }, 200, corsHeaders);
}

/* ---------------- Types ---------------- */

type JsonValue = string | number | boolean | null | { [k: string]: any } | any[];

type AdminRegisterPayload = {
  eventId: string;
  items: Array<{ eventProductId: string; quantity: number }>;

  attendees: Array<{
    eventProductId: string;

    // tolérés (si ton UI les garde), mais c’est mieux de les mettre en answers
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;

    // ✅ public-shape: value jsonb direct
    answers?: Array<{
      eventFormFieldId: string;
      value?: JsonValue;
      // compat legacy (si ton UI envoie encore ça)
      valueText?: string;
      valueInt?: number;
      valueBool?: boolean;
      valueDate?: string; // YYYY-MM-DD
    }>;
  }>;

  buyerEmail?: string;

  buyer?: {
    email?: string;
    name?: string;
    phone?: string;
    isAttendee?: boolean;
  };

  markPaid?: boolean;
  payMode?: "deposit" | "full" | "custom";
  customAmountCents?: number;

  paymentMethod?: "cash" | "bank" | "card" | "other";
  note?: string;

  idempotencyKey?: string;
};

/* ---------------- Utils ---------------- */

function getBearer(req: Request) {
  const h = req.headers.get("authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1] ?? null;
}

function toPositiveInt(v: unknown): number | null {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  const i = Math.trunc(n);
  return i > 0 ? i : null;
}

function toNonEmptyString(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : String(v ?? "").trim();
  return s ? s : null;
}

function isYYYYMMDD(s: string | null): boolean {
  if (!s) return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function sumQuantities(items: Array<{ quantity: number }>) {
  return items.reduce((acc, it) => acc + (toPositiveInt(it.quantity) ?? 0), 0);
}

function unique<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

/**
 * buyer explicite (body.buyer) > buyerEmail legacy > attendee[0]
 */
function buildBuyer(body: AdminRegisterPayload) {
  const firstAtt = body.attendees?.[0] ?? null;

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

  const fallbackEmail = legacyEmail ?? toNonEmptyString(firstAtt?.email) ?? null;
  const fallbackName = (() => {
    const n1 = toNonEmptyString(firstAtt?.firstName);
    const n2 = toNonEmptyString(firstAtt?.lastName);
    const full = [n1, n2].filter(Boolean).join(" ").trim();
    return full ? full : null;
  })();
  const fallbackPhone = toNonEmptyString(firstAtt?.phone);

  return {
    email: fallbackEmail,
    name: fallbackName,
    phone: fallbackPhone,
    is_attendee: true,
  };
}

/**
 * ✅ EXACTEMENT comme public: on veut un champ "value" jsonb
 * - si value est déjà fourni => on le garde tel quel (object/array inclus)
 * - sinon compat legacy: on reconstruit un value simple
 */
function coerceAnswerValue(a: {
  value?: JsonValue;
  valueText?: string;
  valueInt?: number;
  valueBool?: boolean;
  valueDate?: string;
}): JsonValue {
  if (a.value !== undefined) return a.value ?? null;

  if (typeof a.valueBool === "boolean") return a.valueBool;

  if (typeof a.valueInt === "number" && Number.isFinite(a.valueInt)) {
    return a.valueInt;
  }

  if (typeof a.valueDate === "string") {
    const d = a.valueDate.trim();
    if (d) return d;
  }

  if (typeof a.valueText === "string") {
    const t = a.valueText.trim();
    if (t) return t;
  }

  return null;
}

/* ---------------- Handler ---------------- */

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  if (!corsHeaders) return new Response("Forbidden origin", { status: 403 });

  try {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return jsonErr(corsHeaders, 405, "Method not allowed");

    const token = getBearer(req);
    if (!token) return jsonErr(corsHeaders, 401, "Missing Authorization bearer token");

    const body = (await req.json().catch(() => null)) as AdminRegisterPayload | null;
    if (!body?.eventId || !Array.isArray(body.items) || body.items.length === 0 || !Array.isArray(body.attendees)) {
      return jsonErr(corsHeaders, 400, "Invalid payload");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !serviceKey || !anonKey) return jsonErr(corsHeaders, 500, "Server misconfigured");

    // client user : validation JWT
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return jsonErr(corsHeaders, 401, "Invalid session");

    // service role
    const admin = createClient(supabaseUrl, serviceKey);

    /* -------------------------------------------------
     * 0) Validations items/attendees
     * ------------------------------------------------- */
    const cleanedItems = body.items.map((it) => ({
      eventProductId: toNonEmptyString(it.eventProductId),
      quantity: toPositiveInt(it.quantity),
    }));

    if (cleanedItems.some((it) => !it.eventProductId || !it.quantity)) {
      return jsonErr(corsHeaders, 400, "Invalid items (eventProductId/quantity)");
    }

    const itemProductIds = cleanedItems.map((x) => x.eventProductId!) as string[];
    if (unique(itemProductIds).length !== itemProductIds.length) {
      return jsonErr(corsHeaders, 400, "Duplicate eventProductId in items");
    }

    // ⚠️ règle simple : 1 attendee = 1 qty
    const expectedAttendees = sumQuantities(cleanedItems as Array<{ quantity: number }>);
    if (body.attendees.length !== expectedAttendees) {
      return jsonErr(corsHeaders, 400, "Attendees count mismatch", {
        expectedAttendees,
        receivedAttendees: body.attendees.length,
      });
    }

    for (const a of body.attendees) {
      const pid = toNonEmptyString(a.eventProductId);
      if (!pid) return jsonErr(corsHeaders, 400, "Invalid attendee eventProductId");
      if (!itemProductIds.includes(pid)) {
        return jsonErr(corsHeaders, 400, "Attendee references product not in items", { eventProductId: pid });
      }

      for (const ans of a.answers ?? []) {
        const fid = toNonEmptyString(ans.eventFormFieldId);
        if (!fid) return jsonErr(corsHeaders, 400, "Invalid answer eventFormFieldId");

        const d = typeof ans.valueDate === "string" ? ans.valueDate : null;
        if (d && !isYYYYMMDD(d)) {
          return jsonErr(corsHeaders, 400, "Invalid answer valueDate (expected YYYY-MM-DD)", { valueDate: d });
        }
      }
    }

    /* -------------------------------------------------
     * 1) Load event -> org_id
     * ------------------------------------------------- */
    const { data: ev, error: evErr } = await admin
      .from("events")
      .select("id, org_id")
      .eq("id", body.eventId)
      .maybeSingle();

    if (evErr || !ev) return jsonErr(corsHeaders, 404, "Event not found");

    /* -------------------------------------------------
     * 2) AuthZ via RPC is_org_member (JWT mandatory)
     * ------------------------------------------------- */
    const { data: isMember, error: memErr } = await userClient.rpc("is_org_member", {
      p_org_id: ev.org_id,
    });

    if (memErr) return jsonErr(corsHeaders, 500, "Auth check failed", memErr.message);
    if (!isMember) return jsonErr(corsHeaders, 403, "Forbidden");

    /* -------------------------------------------------
     * 3) Vérifier que les products appartiennent à l'event
     * ------------------------------------------------- */
    const { data: products, error: prodErr } = await admin
      .from("event_products")
      .select("id, event_id")
      .in("id", itemProductIds);

    if (prodErr) return jsonErr(corsHeaders, 500, "Product check failed", prodErr.message);
    if (!products || products.length !== itemProductIds.length) {
      return jsonErr(corsHeaders, 400, "Unknown event product in items");
    }
    const bad = products.find((p) => p.event_id !== body.eventId);
    if (bad) return jsonErr(corsHeaders, 400, "Product does not belong to this event", { eventProductId: bad.id });

    /* -------------------------------------------------
     * 4) create_order_intent
     * ------------------------------------------------- */
    const p_items = cleanedItems.map((it) => ({
      event_product_id: it.eventProductId!,
      quantity: it.quantity!,
    }));

    // ✅ même shape que public
    const p_attendees = body.attendees.map((a) => ({
      event_product_id: a.eventProductId,
      first_name: null,
      last_name: null,
      email: null,
      phone: null,
      answers: (a.answers ?? []).map((x) => ({
        event_form_field_id: x.eventFormFieldId,
        value: coerceAnswerValue(x),
      })),
    }));

    const p_buyer = buildBuyer(body);

    const { data: rpcRes, error: rpcErr } = await admin.rpc("create_order_intent", {
      p_event_id: body.eventId,
      p_items,
      p_attendees,
      p_buyer,
      p_rate_key: null,
    });

    if (rpcErr) return jsonErr(corsHeaders, 400, "RPC create_order_intent failed", rpcErr.message);

    const orderId = rpcRes?.order_id as string | undefined;
    const totalCents = rpcRes?.total_cents as number | undefined;
    const dueNowCentsRaw = rpcRes?.amount_due_now_cents as number | undefined;
    const currency = rpcRes?.currency as string | undefined;
    const paymentRequired = Boolean(rpcRes?.payment_required);

    if (!orderId || typeof totalCents !== "number" || !currency) {
      return jsonErr(corsHeaders, 500, "Order creation failed (unexpected RPC result)");
    }

    const baseStatus =
      (rpcRes?.status as string | undefined) ?? (paymentRequired ? "awaiting_payment" : "paid");

    /* -------------------------------------------------
     * 5) Optionnel: paiement offline
     * ------------------------------------------------- */
    if (body.markPaid) {
      const mode = body.payMode ?? "deposit";
      let amountCents: number;

      if (mode === "deposit") {
        amountCents = typeof dueNowCentsRaw === "number" ? dueNowCentsRaw : totalCents;
      } else if (mode === "full") {
        amountCents = totalCents;
      } else {
        const x = toPositiveInt(body.customAmountCents);
        if (!x) return jsonErr(corsHeaders, 400, "Invalid customAmountCents");
        amountCents = x;
      }

      if (amountCents <= 0) return jsonErr(corsHeaders, 400, "Invalid payment amount");
      if (amountCents > totalCents) {
        return jsonErr(corsHeaders, 400, "Payment amount cannot exceed total", { amountCents, totalCents });
      }

      // pas de paiement requis -> on renvoie quand même shape complète
      if (!paymentRequired || totalCents === 0) {
        return jsonOk(corsHeaders, {
          orderId,
          currency: String(currency).toUpperCase(),
          totalCents,
          status: "paid",
          amountAppliedCents: 0,
          dueNowCents: 0,
          bookingToken: null,
          expiresAt: null,
          payment: null,
        });
      }

      const offlineRef = `offline:${crypto.randomUUID()}`;

      const metaNote = [
        body.paymentMethod ? `method=${body.paymentMethod}` : null,
        body.note ? `note=${body.note}` : null,
        `by=${userData.user.id}`,
      ]
        .filter(Boolean)
        .join(" | ");

      const { data: payRes, error: payErr } = await admin.rpc("apply_order_payment", {
        p_order_id: orderId,
        p_provider: "offline",
        p_amount_cents: amountCents,
        p_currency: String(currency).toUpperCase(),
        p_provider_payment_id: offlineRef,
        p_raw: null,
        p_note: metaNote || null,
      });

      if (payErr) {
        return jsonErr(corsHeaders, 400, "apply_order_payment_failed", payErr.message);
      }

      return jsonOk(corsHeaders, {
        orderId,
        currency: String(currency).toUpperCase(),
        totalCents,
        status: "paid",
        amountAppliedCents: amountCents,
        dueNowCents: 0,
        bookingToken: null,
        expiresAt: null,
        payment: payRes ?? null,
      });
    }

    /* -------------------------------------------------
     * 6) Paiement online / intent simple
     * ------------------------------------------------- */
    return jsonOk(corsHeaders, {
      orderId,
      currency: String(currency).toUpperCase(),
      totalCents,
      status: baseStatus,
      dueNowCents: typeof dueNowCentsRaw === "number" ? dueNowCentsRaw : null,
      bookingToken: (rpcRes?.booking_token as string | undefined) ?? null,
      expiresAt: (rpcRes?.expires_at as string | undefined) ?? null,
      amountAppliedCents: null,
      payment: null,
    });
  } catch (e) {
    const fallbackCors =
      corsHeadersFor(req) ??
      ({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Max-Age": "86400",
      } as const);

    return jsonErr(fallbackCors, 500, "Unexpected error", String(e));
  }
});
