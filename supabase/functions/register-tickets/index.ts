import { json, corsHeaders } from "./http.ts";
import { ResponseError } from "./errors.ts";
import { parseRegisterPayload } from "./validation.ts";
import { resolveRuntimeConfig } from "./config.ts";
import {
  createAdminClient,
  createOrderIntentOrThrow,
  getEventPaymentContextOrThrow,
  getOrgPlanOrThrow,
  issueFreeOrderTicketsOrThrow,
} from "./db.ts";
import { buildBuyer } from "./buyer.ts";
import { getClientIp, verifyCaptchaOrThrow } from "./turnstile.ts";
import { resolveCheckoutContextOrThrow } from "./checkout.ts";
import { getValidOrgMollieAccessOrThrow } from "./mollie-auth.ts";
import { findReusablePayment, createMolliePayment, insertPaymentOrRollback } from "./mollie-payments.ts";
import { sendConfirmationEmailForOrderSafe } from "./emails.ts";

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    if (req.method !== "POST") {
      return json({ error: "METHOD_NOT_ALLOWED" }, 405);
    }

    const body = await parseRegisterPayload(req);
    const config = resolveRuntimeConfig(req);
    const admin = createAdminClient(config);
    const ip = getClientIp(req);

    await verifyCaptchaOrThrow({
      token: body.turnstileToken,
      ip,
      turnstileSecret: config.turnstileSecret,
      turnstileBypass: config.turnstileBypass,
    });

    const checkout = resolveCheckoutContextOrThrow(body, config);
    const buyer = buildBuyer(body);

    const order = await createOrderIntentOrThrow({
      admin,
      eventId: body.eventId,
      items: body.items,
      attendees: body.attendees,
      buyer,
      ip,
      rateLimitPer10Min: config.registerRateLimitPer10Min,
    });

    if (!order.paymentRequired || order.totalCents === 0) {
      await issueFreeOrderTicketsOrThrow(admin, order.orderId);

      await sendConfirmationEmailForOrderSafe({
        admin,
        orderId: order.orderId,
        functionsBase: config.functionsBase,
        edgeServiceToken: config.edgeServiceToken,
      });

      return json({
        ok: true,
        orderId: order.orderId,
        status: "paid",
        bookingToken: order.bookingToken,
      });
    }

    const { orgId, eventTitle } = await getEventPaymentContextOrThrow(admin, body.eventId);

    if (checkout.checkoutSource === "widget") {
      const orgPlan = await getOrgPlanOrThrow(admin, orgId);
      if (orgPlan === "free") {
        return json({ error: "WIDGET_NOT_AVAILABLE_FOR_FREE_PLAN" }, 403);
      }
    }

    const mollieAuth = await getValidOrgMollieAccessOrThrow(admin, orgId, config);

    const reusable = await findReusablePayment(admin, order.orderId);
    if (reusable) {
      return json({
        ok: true,
        orderId: order.orderId,
        status: "awaiting_payment",
        checkoutUrl: reusable.checkoutUrl,
        amountDueNowCents: order.dueNowCents,
        totalCents: order.totalCents,
        reusedPayment: true,
        bookingToken: order.bookingToken,
      });
    }

    const payment = await createMolliePayment({
      accessToken: mollieAuth.accessToken,
      profileId: mollieAuth.profileId,
      isTest: mollieAuth.isTest,
      orderId: order.orderId,
      orgId,
      bookingToken: order.bookingToken,
      dueNowCents: order.dueNowCents,
      totalCents: order.totalCents,
      currency: order.currency,
      redirectUrl: checkout.buildRedirectUrl(order.orderId, order.bookingToken),
      webhookUrl: `${config.functionsBase}/mollie-webhook-tickets`,
      eventTitle,
      buyerEmail: buyer.email,
    });

    await insertPaymentOrRollback({
      admin,
      accessToken: mollieAuth.accessToken,
      isTest: mollieAuth.isTest,
      orderId: order.orderId,
      dueNowCents: order.dueNowCents,
      currency: order.currency,
      molliePayment: payment.raw,
      providerPaymentId: payment.providerPaymentId,
    });

    return json({
      ok: true,
      orderId: order.orderId,
      status: "awaiting_payment",
      checkoutUrl: payment.checkoutUrl,
      amountDueNowCents: order.dueNowCents,
      totalCents: order.totalCents,
      reusedPayment: false,
      bookingToken: order.bookingToken,
    });
  } catch (e) {
    console.error("[register-tickets] unexpected", e);

    if (e instanceof ResponseError) {
      return json({ error: e.code }, e.status);
    }

    return json({ error: "UNEXPECTED_ERROR" }, 500);
  }
});