import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { internal, ResponseError } from "./errors.ts";

export function createAdminClient(config: { supabaseUrl: string; serviceKey: string }) {
  return createClient(config.supabaseUrl, config.serviceKey);
}

function mapRpcError(msg: string) {
  const m = String(msg ?? "");

  if (m.includes("EVENT_SOLD_OUT")) return new ResponseError(409, "EVENT_SOLD_OUT");
  if (m.includes("MISSING_GATEKEEPER_PRODUCT")) return new ResponseError(400, "MISSING_GATEKEEPER_PRODUCT");
  if (m.toLowerCase().includes("insufficient stock")) return new ResponseError(409, "SOLD_OUT");
  if (m.toLowerCase().includes("attendees count mismatch")) return new ResponseError(400, "ATTENDEES_MISMATCH");
  if (m.includes("EVENT_NOT_PUBLISHED")) return new ResponseError(409, "EVENT_NOT_PUBLISHED");
  if (m.includes("EVENT_ENDED")) return new ResponseError(409, "EVENT_ENDED");

  return new ResponseError(400, "FAILED");
}

export async function createOrderIntentOrThrow(opts: {
  admin: any;
  eventId: string;
  items: any[];
  attendees: any[];
  buyer: any;
  ip: string;
  rateLimitPer10Min: number;
}) {
  const rateLimitKey = `register:${opts.eventId}:${opts.ip}`;

  const { error: rlErr } = await opts.admin.rpc("assert_rate_limit", {
    p_key: rateLimitKey,
    p_limit: opts.rateLimitPer10Min,
    p_window_seconds: 600,
  });

  if (rlErr) {
    throw new ResponseError(429, "TOO_MANY_REQUESTS");
  }

  const { data, error } = await opts.admin.rpc("create_order_intent", {
    p_event_id: opts.eventId,
    p_items: opts.items.map((it) => ({
      event_product_id: it.eventProductId,
      quantity: it.quantity,
    })),
    p_attendees: opts.attendees.map((a) => ({
      event_product_id: a.eventProductId,
      first_name: null,
      last_name: null,
      email: null,
      phone: null,
      answers: (a.answers ?? []).map((x: any) => ({
        event_form_field_id: x.eventFormFieldId,
        value: x.value ?? null,
      })),
    })),
    p_buyer: opts.buyer,
    p_rate_key: rateLimitKey,
  });

  if (error) {
    console.error("[register] create_order_intent failed", error);
    throw mapRpcError(error.message ?? "unknown_rpc_error");
  }

  const orderId = data?.order_id;
  const bookingToken = data?.booking_token ?? null;
  const paymentRequired = Boolean(data?.payment_required);
  const totalCents = Number(data?.total_cents ?? 0);
  const currency = data?.currency || "EUR";
  const dueNowCents = typeof data?.amount_due_now_cents === "number"
    ? Number(data.amount_due_now_cents)
    : totalCents;

  if (!orderId) throw internal("ORDER_CREATION_FAILED");
  if (!bookingToken) throw internal("BOOKING_TOKEN_MISSING");
  if (paymentRequired && dueNowCents <= 0) throw internal("INVALID_PAYMENT_AMOUNT");

  return {
    orderId,
    bookingToken,
    paymentRequired,
    totalCents,
    dueNowCents,
    currency,
  };
}

export async function issueFreeOrderTicketsOrThrow(admin: any, orderId: string) {
  const { data, error } = await admin.rpc("issue_order_tickets", {
    p_order_id: orderId,
  });

  if (error) {
    console.error("[register] issue_order_tickets failed", error);
    throw internal("TICKETS_ISSUE_FAILED", { data, error });
  }
}

export async function getEventOrgIdOrThrow(admin: any, eventId: string) {
  const { data, error } = await admin.from("events")
    .select("org_id")
    .eq("id", eventId)
    .maybeSingle();

  if (error || !data?.org_id) {
    throw new ResponseError(404, "EVENT_NOT_FOUND");
  }

  return data.org_id;
}

export async function getOrgPlanOrThrow(admin: any, orgId: string) {
  const { data, error } = await admin.from("organizations")
    .select("plan")
    .eq("id", orgId)
    .maybeSingle();

  if (error) {
    throw internal("ORG_PLAN_LOAD_FAILED");
  }

  return String(data?.plan ?? "free").trim().toLowerCase();
}