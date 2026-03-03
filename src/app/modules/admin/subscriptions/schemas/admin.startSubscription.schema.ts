import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Payload                                                            */
/* ------------------------------------------------------------------ */

export const startSubscriptionPayloadSchema = z.object({
  orgId: z.string().uuid(),
  plan: z.enum(["starter", "pro"]),
});

export type StartSubscriptionPayload = z.infer<typeof startSubscriptionPayloadSchema>;

/* ------------------------------------------------------------------ */
/* Response                                                           */
/* ------------------------------------------------------------------ */

export const startSubscriptionResponseSchema = z.union([
  // ✅ cas: déjà abonné / subscription créée direct
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
  }),

  // ✅ cas: pas de mandate => checkout FIRST payment
  z.object({
    ok: z.literal(true),
    action: z.literal("checkout"),
    orgId: z.string().uuid(),
    plan: z.enum(["starter", "pro"]),
    mollieCustomerId: z.string(),
    checkoutUrl: z.string().url(),
    paymentId: z.string(),
  }),

  // ⚠️ cas: edge a créé côté Mollie mais DB pas à jour (warning)
  z.object({
    ok: z.literal(false),
    warning: z.literal("subscription_created_but_db_not_updated"),
    details: z.string(),
    mollieCustomerId: z.string().nullable().optional(),
    mollieSubscriptionId: z.string().nullable().optional(),
    status: z.string().optional(),
  }),

  // ✅ cas: payment webhook ou subscription webhook répond ok (si jamais tu l’appelles direct, pas obligé)
  z.object({
    ok: z.literal(true),
    reused: z.boolean().optional(),
    reason: z.string().optional(),
  }),
]);

export type StartSubscriptionResponse = z.infer<typeof startSubscriptionResponseSchema>;
