import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import crypto from "node:crypto";
import { json, handleCorsAndMethod } from "../_shared/http.ts";
import { createEdgeLogger, serializeError } from "../_shared/logger.ts";
import { resolveSupabaseRuntimeConfig } from "../_shared/config.ts";
import { requireBearer } from "../_shared/auth.ts"; 
import { parseAdminRegisterPayload } from "./validation.ts";
import { ResponseError } from "../_shared/errors.ts";
import {
  type AdminRegisterPayload,
} from "./adminRegister.contracts.ts";


function buildBuyer(body: AdminRegisterPayload) {
  const buyer = body.buyer ?? {};

  return {
    email: buyer.email ?? body.buyerEmail ?? null,
    name: buyer.name ?? null,
    phone: buyer.phone ?? null,
    is_attendee:
      typeof buyer.isAttendee === "boolean" ? buyer.isAttendee : false,
  };
}

Deno.serve(async (req)=>{

  const logger = createEdgeLogger("admin-register");

  try {

    logger.info("request_received", {
      method: req.method,
      origin: req.headers.get("origin"),
    });

    const methodResponse = handleCorsAndMethod(req, logger);
    if (methodResponse) return methodResponse;

    const auth = requireBearer(req, logger);
    if (auth.response) return auth.response;

    const token = auth.token;
    
    const body = await parseAdminRegisterPayload(req, logger);

    const { supabaseUrl, anonKey, serviceKey } = resolveSupabaseRuntimeConfig();

    const userClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser();

    if (userErr || !userData?.user) {
        logger.warn("invalid_session");
        return json({
          error: "INVALID_SESSION"
        }, 401);
      }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: ev, error: evErr } = await admin.from("events").select("id, org_id").eq("id", body.eventId).maybeSingle();
    
    if (evErr || !ev) {
      logger.warn("event_not_found");
        return json(
            {
              error: "EVENT_NOT_FOUND",
            },
            404,
          );
    }


    const { data: isMember, error: memErr } = await userClient.rpc("is_org_member", {
      p_org_id: ev.org_id
    });

    if (memErr) {
      logger.warn("auth_check_failed");
      return json(
          {
            error: "AUTH_CHECK_FAILED",
          },
          500,
        );
    }

    if (!isMember) {
      logger.warn("user_not_org_member");
      return json(
          {
            error: "FORBIDDEN",
          },
            403,
        );
    }

    const itemProductIds = body.items.map((x) => x.eventProductId);

    const { data: products, error: prodErr } = await admin.from("event_products").select("id, event_id").in("id", itemProductIds);
    
    if (prodErr) {
      logger.warn("product_check_failed");
      return json(
          {
            error: "PRODUCT_CHECK_FAILED",
            details: { 
              message: prodErr.message,
            }
          },
            500,
        );
    }


    if (!products || products.length !== itemProductIds.length) {
      logger.warn("unknown_event_product_in_items");
      return json(
          {
            error: "UNKNOWN_EVENT_PRODUCT_IN_ITEMS",
            
          },
            400,
        );
    }

    const bad = products.find((p)=>p.event_id !== body.eventId);

    if (bad) {
      logger.warn("product_does_not_belong_to_this_event");
      return json(
          {
            error: "PRODUCT_EVENT_MISMATCH",
            details: {
              eventProductId: bad.id,
            }
            
          },
            400,
        );
    }


    const p_items = body.items.map((it) => ({
      event_product_id: it.eventProductId,
      quantity: it.quantity,
    }));

    const p_attendees = body.attendees.map((a)=>({
        event_product_id: a.eventProductId,
        first_name: null,
        last_name: null,
        email: null,
        phone: null,
        answers: (a.answers ?? []).map((x)=>({
            event_form_field_id: x.eventFormFieldId,
            value: x.value ?? null
          }))
      }));

    const p_buyer = buildBuyer(body);

    const { data: rpcRes, error: rpcErr } = await admin.rpc("create_order_intent", {
      p_event_id: body.eventId,
      p_items,
      p_attendees,
      p_buyer,
      p_rate_key: null
    });

    if (rpcErr) {
      logger.warn("rpc_create_order_intent_failed");
      return json(
          {
            error: "RPC_CREATE_ORDER_INTENT_FAILED",
            details: {
              message: rpcErr.message,
            }
          },
            400,
        );
    }

    const orderId = rpcRes?.order_id;
    const totalCents = rpcRes?.total_cents;
    const dueNowCentsRaw = rpcRes?.amount_due_now_cents;
    const currency = rpcRes?.currency;
    const paymentRequired = Boolean(rpcRes?.payment_required);

    if (!orderId || typeof totalCents !== "number" || !currency) {
      logger.warn("order_creation_failed");
      return json(
          {
            error: "ORDER_CREATION_FAILED",
            details: {
              reason: "unexpected_rpc_result",
            }
          },
            500,
        );
    }

    const baseStatus = rpcRes?.status ?? (paymentRequired ? "awaiting_payment" : "paid");

    if (body.markPaid) {

      const mode = body.payMode ?? "deposit";
      let amountCents;

      if (mode === "deposit") {
        amountCents = typeof dueNowCentsRaw === "number" ? dueNowCentsRaw : totalCents;
      } else if (mode === "full") {
        amountCents = totalCents;
      } else {
        amountCents = body.customAmountCents ?? 0;
      }

      if (amountCents > totalCents) {
        logger.warn("payment_amount_cannot_exceed_total");
            return json(
                {
                  error: "PAYMENT_AMOUNT_EXCEEDS_TOTAL",
                  details: { amountCents, totalCents },
                },
                  400,
              );  
      }

      if (!paymentRequired || totalCents === 0) {
        logger.info("completed", {
          orderId,
          status: "paid",
          markPaid: Boolean(body.markPaid),
        });

        return json({
          ok: true,
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

      if (amountCents <= 0) {
        logger.warn("invalid_payment_amount");
        return json({ error: "INVALID_PAYMENT_AMOUNT" }, 400);
      }

      const offlineRef = `offline:${crypto.randomUUID()}`;

      const metaNote = [
        body.paymentMethod ? `method=${body.paymentMethod}` : null,
        body.note ? `note=${body.note}` : null,
        `by=${userData.user.id}`
      ].filter(Boolean).join(" | ");

      const { data: payRes, error: payErr } = await admin.rpc("apply_order_payment", {
        p_order_id: orderId,
        p_provider: "offline",
        p_amount_cents: amountCents,
        p_currency: String(currency).toUpperCase(),
        p_provider_payment_id: offlineRef,
        p_raw: null,
        p_note: metaNote || null
      });

      if (payErr) {
        logger.warn("apply_order_payment_failed");
        return json(
            {
              error: "APPLY_ORDER_PAYMENT_FAILED",
              details: {
                message: payErr.message,
              }  
            },
              400,
          );
      }

      logger.info("offline_payment_applied", {
        orderId,
        amountCents,
      });

      logger.info("completed", {
        orderId,
        status: "paid",
        markPaid: true,
      });

      return json({
        ok: true,
        orderId,
        currency: String(currency).toUpperCase(),
        totalCents,
        status: "paid",
        amountAppliedCents: amountCents,
        dueNowCents: 0,
        bookingToken: null,
        expiresAt: null,
        payment: payRes ?? null
      });
    }

     logger.info("completed", {
      orderId,
      status: baseStatus,
      markPaid: false,
    });

      return json({
        ok: true,
        orderId,
        currency: String(currency).toUpperCase(),
        totalCents,
        status: baseStatus,
        dueNowCents: typeof dueNowCentsRaw === "number" ? dueNowCentsRaw : null,
        bookingToken: rpcRes?.booking_token ?? null,
        expiresAt: rpcRes?.expires_at ?? null,
        amountAppliedCents: null,
        payment: null
      });

  } catch (e) {
  if (e instanceof ResponseError) {
    logger.warn("response_error", {
      code: e.code,
      status: e.status,
    });

    return json(
      {
        error: e.code,
        ...(e.details ? { details: e.details } : {}),
      },
      e.status,
    );
  }

  logger.error("unexpected_error", serializeError(e));

  return json(
    {
      error: "UNEXPECTED_ERROR",
    },
    500,
  );
}
});
