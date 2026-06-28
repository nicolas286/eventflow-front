import { json, handleCorsAndMethod } from "../_shared/http.ts";
import { ResponseError } from "../_shared/errors.ts";
import { parseRegisterPayload } from "./validation.ts";
import { resolveRuntimeConfig } from "./config.ts";
import { createAdminClient, createOrderIntentOrThrow, getEventPaymentContextOrThrow, getOrgPlanOrThrow, issueFreeOrderTicketsOrThrow } from "./db.ts";
import { buildBuyer } from "./buyer.ts";
import { getClientIp, verifyCaptchaOrThrow } from "./turnstile.ts";
import { resolveCheckoutContextOrThrow } from "./checkout.ts";
import { getValidOrgMollieAccessOrThrow } from "./mollie-auth.ts";
import { findReusablePayment, createMolliePayment, insertPaymentOrRollback } from "./mollie-payments.ts";
import { sendConfirmationEmailForOrderSafe } from "./emails.ts";
import { createEdgeLogger, serializeError } from "../_shared/logger.ts";

Deno.serve(async (req)=>{

  const logger = createEdgeLogger("register-tickets");

  try {

    logger.info("request_received", {
      method: req.method,
      origin: req.headers.get("origin"),
    });
    
    const methodResponse = handleCorsAndMethod(req, logger);
    if (methodResponse) return methodResponse;

    const body = await parseRegisterPayload(req);

    logger.info("payload_parsed", {
    eventId: body.eventId,
    itemsCount: body.items.length,
    attendeesCount: body.attendees.length,
    checkoutSource: body.checkoutSource ?? null,
    hasBuyerEmail: Boolean(body.buyer?.email ?? body.buyerEmail),
  });

    const config = resolveRuntimeConfig(req);
    const admin = createAdminClient(config);
    const ip = getClientIp(req);

    await verifyCaptchaOrThrow({
      token: body.turnstileToken,
      ip,
      turnstileSecret: config.turnstileSecret,
      turnstileBypass: config.turnstileBypass
    });

    logger.info("captcha_verified", {
      turnstileBypass: config.turnstileBypass,
    });

    const checkout = resolveCheckoutContextOrThrow(body, config);

    logger.info("checkout_resolved", {
      checkoutSource: checkout.checkoutSource,
    });

    const buyer = buildBuyer(body);

    const order = await createOrderIntentOrThrow({
      admin,
      eventId: body.eventId,
      items: body.items,
      attendees: body.attendees,
      buyer,
      ip,
      rateLimitPer10Min: config.registerRateLimitPer10Min
    });

    logger.info("order_created", {
        orderId: order.orderId,
        paymentRequired: order.paymentRequired,
        totalCents: order.totalCents,
        dueNowCents: order.dueNowCents,
        currency: order.currency,
      });

    if (!order.paymentRequired || order.totalCents === 0) {

      logger.info("free_order_start", {
        orderId: order.orderId,
      });

      await issueFreeOrderTicketsOrThrow(admin, order.orderId);

      logger.info("free_tickets_issued", {
        orderId: order.orderId,
      });

      await sendConfirmationEmailForOrderSafe({
        admin,
        orderId: order.orderId,
        functionsBase: config.functionsBase,
        edgeServiceToken: config.edgeServiceToken
      });

      logger.info("free_order_completed", {
        orderId: order.orderId,
      });

      return json({
        ok: true,
        orderId: order.orderId,
        status: "paid",
        bookingToken: order.bookingToken
      });
    }
    const { orgId, eventTitle } = await getEventPaymentContextOrThrow(admin, body.eventId);

    logger.info("payment_context_loaded", {
      orderId: order.orderId,
      orgId,
      eventTitle,
    });

    if (checkout.checkoutSource === "widget") {
      const orgPlan = await getOrgPlanOrThrow(admin, orgId);

      logger.info("widget_plan_checked", {
        orgId,
        orgPlan,
      });

      if (orgPlan === "free") {

        logger.warn("widget_blocked_free_plan", {
          orgId,
          orderId: order.orderId,
        });

        return json({
          error: "WIDGET_NOT_AVAILABLE_FOR_FREE_PLAN"
        }, 403);
      }
    }
    const mollieAuth = await getValidOrgMollieAccessOrThrow(admin, orgId, config);

    logger.info("mollie_auth_loaded", {
      orgId,
      isTest: mollieAuth.isTest,
      hasProfileId: Boolean(mollieAuth.profileId),
    });

    const reusable = await findReusablePayment(admin, order.orderId);
    if (reusable) {

      logger.info("reusable_payment_found", {
        orderId: order.orderId,
      });

      return json({
        ok: true,
        orderId: order.orderId,
        status: "awaiting_payment",
        checkoutUrl: reusable.checkoutUrl,
        amountDueNowCents: order.dueNowCents,
        totalCents: order.totalCents,
        reusedPayment: true,
        bookingToken: order.bookingToken
      });
    }

    logger.info("mollie_payment_create_start", {
      orderId: order.orderId,
      orgId,
      dueNowCents: order.dueNowCents,
      totalCents: order.totalCents,
      currency: order.currency,
    });

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
      buyerEmail: buyer.email
    });

    logger.info("mollie_payment_created", {
      orderId: order.orderId,
      providerPaymentId: payment.providerPaymentId,
    });

    await insertPaymentOrRollback({
      admin,
      accessToken: mollieAuth.accessToken,
      isTest: mollieAuth.isTest,
      orderId: order.orderId,
      dueNowCents: order.dueNowCents,
      currency: order.currency,
      molliePayment: payment.raw,
      providerPaymentId: payment.providerPaymentId
    });

    logger.info("payment_inserted", {
      orderId: order.orderId,
      providerPaymentId: payment.providerPaymentId,
    });

    logger.info("completed_awaiting_payment", {
      orderId: order.orderId,
      reusedPayment: false,
    });

    return json({
      ok: true,
      orderId: order.orderId,
      status: "awaiting_payment",
      checkoutUrl: payment.checkoutUrl,
      amountDueNowCents: order.dueNowCents,
      totalCents: order.totalCents,
      reusedPayment: false,
      bookingToken: order.bookingToken
    });
  } catch (e) {
     if (e instanceof ResponseError) {
       logger.warn("response_error", {
        code: e.code,
        status: e.status,
      });

      return json(
        { error: e.code },
        e.status,
      );
    }

    logger.error("unexpected_error", serializeError(e));

    return json({
      error: "UNEXPECTED_ERROR"
    }, 500);
  }
});
