import { z } from "zod";

export const dbPromoCodeBaseSchema = z.object({
  id: z.uuid(),

  orgId: z.uuid(),
  eventId: z.uuid(),

  code: z.string().trim().min(1).max(20),

  discountPercent: z.number().int().min(1).max(100).nullable(),
  discountCents: z.number().int().min(1).max(100_000).nullable(),

  maxUses: z.number().int().min(1).max(99_999).nullable(),
  usedCount: z.number().int().min(0).max(99_999),

  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),

  isActive: z.boolean(),

  createdAt: z.string(),
  updatedAt: z.string(),
});

export const dbPromoCodeSchema = dbPromoCodeBaseSchema.refine(
  (x) =>
    (x.discountPercent !== null && x.discountCents === null) ||
    (x.discountPercent === null && x.discountCents !== null),
  {
    message: "PROMO_CODE_REQUIRES_EXACTLY_ONE_DISCOUNT_TYPE",
    path: ["discountPercent"],
  }
);

export type DbPromoCode = z.infer<typeof dbPromoCodeSchema>;