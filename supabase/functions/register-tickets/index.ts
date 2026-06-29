import { json } from "../_shared/http.ts";
import { createEdgeHandler } from "../_shared/edge-handler.ts";
import { createAdminClient } from "../_shared/supabase.ts";

import { parseRegisterPayload } from "./validation.ts";
import { resolveRuntimeConfig } from "./config.ts";
import {
  createOrderIntentOrThrow,
  getEventPaymentContextOrThrow,
} from "./db.ts";
import { buildBuyer } from "./buyer.ts";
import { getClientIp, verifyCaptchaOrThrow } from "./turnstile.ts";
import { resolveCheckoutContextOrThrow } from "./checkout.ts";
import { getValidOrgMollieAccessOrThrow } from "./mollie-auth.ts";
import {
  findReusablePayment,
  createMolliePayment,
  insertPaymentOrRollback,
} from "./mollie-payments.ts";
import { completeFreeOrderOrThrow } from "./free-order.ts";
import { assertWidgetAllowedForOrgOrThrow } from "./widget.ts";


Deno.serve(createEdgeHandler("register-tickets", async (req, { logger }) => {
  const body = await parseRegisterPayload(req);

  logger.info("payload_parsed", {
    eventId: body.eventId,
    itemsCount: body.items.length,
    attendeesCount: body.attendees.length,
    checkoutSource: body.checkoutSource ?? null,
    hasBuyerEmail: Boolean(body.buyer?.email ?? body.buyerEmail),
    hasPromoCode: Boolean(body.promoCode),
  });

  const config = resolveRuntimeConfig(req);
  const admin = createAdminClient(config);
  const ip = getClientIp(req);

  await verifyCaptchaOrThrow({
    token: body.turnstileToken,
    ip,
    turnstileSecret: config.turnstileSecret,
    turnstileBypass: config.turnstileBypass,
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
    rateLimitPer10Min: config.registerRateLimitPer10Min,
    promoCode: body.promoCode ?? null,
  });

  logger.info("order_created", {
    orderId: order.orderId,
    paymentRequired: order.paymentRequired,
    totalCents: order.totalCents,
    discountCents: order.discountCents,
    dueNowCents: order.dueNowCents,
    currency: order.currency,
  });

  const { orgId, eventTitle } = await getEventPaymentContextOrThrow(
    admin,
    body.eventId,
  );

  logger.info("payment_context_loaded", {
    orderId: order.orderId,
    orgId,
    eventTitle,
  });

  if (checkout.checkoutSource === "widget") {
    await assertWidgetAllowedForOrgOrThrow({
      admin,
      orgId,
      orderId: order.orderId,
      logger,
    });
  }

  if (!order.paymentRequired || order.dueNowCents === 0) {
  return await completeFreeOrderOrThrow({
    admin,
    order,
    config,
    logger,
  });
  }


  const mollieAuth = await getValidOrgMollieAccessOrThrow(
    admin,
    orgId,
    config,
  );

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
      discountCents: order.discountCents,
      reusedPayment: true,
      bookingToken: order.bookingToken,
    });
  }

  logger.info("mollie_payment_create_start", {
    orderId: order.orderId,
    orgId,
    dueNowCents: order.dueNowCents,
    totalCents: order.totalCents,
    discountCents: order.discountCents,
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
    redirectUrl: checkout.buildRedirectUrl(
      order.orderId,
      order.bookingToken,
    ),
    webhookUrl: `${config.functionsBase}/mollie-webhook-tickets`,
    eventTitle,
    buyerEmail: buyer.email,
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
    providerPaymentId: payment.providerPaymentId,
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
    bookingToken: order.bookingToken,
    discountCents: order.discountCents,
  });
}));