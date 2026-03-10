import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Payload                                                            */
/* ------------------------------------------------------------------ */

export const startSubscriptionPayloadSchema = z.object({
  orgId: z.string().uuid(),
  plan: z.enum(["starter", "pro"]),
  promoCode: z.string().trim().min(1).max(100).nullable().optional(),
});

export type StartSubscriptionPayload = z.infer<typeof startSubscriptionPayloadSchema>;

/* ------------------------------------------------------------------ */
/* Shared                                                             */
/* ------------------------------------------------------------------ */

const sharedPricingFields = {
  promoApplied: z.boolean().optional(),
  discountPercent: z.number().int().min(0).max(100).optional(),
  billingPriceValue: z.string().optional(),
};

const sharedDebugFields = {
  returnBaseUrl: z.string().optional(),
  canceledPrevious: z.boolean().optional(),
};

/* ------------------------------------------------------------------ */
/* Response                                                           */
/* ------------------------------------------------------------------ */

export const startSubscriptionResponseSchema = z.union([
  z.object({
    ok: z.literal(true),
    action: z.literal("sub_created"),
    orgId: z.string().uuid(),
    plan: z.enum(["starter", "pro"]),
    mollieCustomerId: z.string().nullable().optional(),
    mollieSubscriptionId: z.string().nullable().optional(),
    status: z.string().optional(),
    currentPeriodEnd: z.string().nullable().optional(),
    reused: z.boolean().optional(),
    ...sharedPricingFields,
    ...sharedDebugFields,
  }),

  z.object({
    ok: z.literal(true),
    action: z.literal("checkout"),
    orgId: z.string().uuid(),
    plan: z.enum(["starter", "pro"]),
    mollieCustomerId: z.string(),
    checkoutUrl: z.string().url(),
    paymentId: z.string(),
    ...sharedPricingFields,
    ...sharedDebugFields,
  }),

  z.object({
    ok: z.literal(false),
    warning: z.literal("subscription_created_but_db_not_updated"),
    details: z.string(),
    mollieCustomerId: z.string().nullable().optional(),
    mollieSubscriptionId: z.string().nullable().optional(),
    status: z.string().optional(),
    canceledPrevious: z.boolean().optional(),
  }),

  z.object({
    ok: z.literal(true),
    reused: z.boolean().optional(),
    reason: z.string().optional(),
  }),
]);

export type StartSubscriptionResponse = z.infer<typeof startSubscriptionResponseSchema>;