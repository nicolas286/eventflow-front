import { z } from "zod";
import { dbPromoCodeBaseSchema } from "@shared/models/db/db.promoCode.schema";

export const promoCodeValueSchema = dbPromoCodeBaseSchema.shape.code.transform(
  (v) => v.toUpperCase()
);

function promoCodeHasExactlyOneDiscount(x: {
  discountPercent: number | null;
  discountCents: number | null;
}) {
  return (
    (x.discountPercent !== null && x.discountCents === null) ||
    (x.discountPercent === null && x.discountCents !== null)
  );
}

function promoCodeDatesAreValid(x: {
  startsAt?: string | null;
  endsAt?: string | null;
}) {
  return (
    !x.startsAt ||
    !x.endsAt ||
    new Date(x.startsAt).getTime() < new Date(x.endsAt).getTime()
  );
}

export const createPromoCodeInputSchema = dbPromoCodeBaseSchema
  .pick({
    orgId: true,
    eventId: true,
    discountPercent: true,
    discountCents: true,
    maxUses: true,
    startsAt: true,
    endsAt: true,
    isActive: true,
  })
  .extend({
    code: promoCodeValueSchema,
    maxUses: dbPromoCodeBaseSchema.shape.maxUses.optional(),
    startsAt: dbPromoCodeBaseSchema.shape.startsAt.optional(),
    endsAt: dbPromoCodeBaseSchema.shape.endsAt.optional(),
    isActive: dbPromoCodeBaseSchema.shape.isActive.optional(),
  })
  .strict()
  .refine(promoCodeHasExactlyOneDiscount, {
    message: "PROMO_CODE_REQUIRES_EXACTLY_ONE_DISCOUNT_TYPE",
    path: ["discountPercent"],
  })
  .refine(promoCodeDatesAreValid, {
    message: "PROMO_CODE_INVALID_DATE_RANGE",
    path: ["endsAt"],
  });

export type CreatePromoCodeInput = z.infer<typeof createPromoCodeInputSchema>;

export const updatePromoCodePatchSchema = dbPromoCodeBaseSchema
  .pick({
    discountPercent: true,
    discountCents: true,
    maxUses: true,
    startsAt: true,
    endsAt: true,
    isActive: true,
  })
  .extend({
    code: promoCodeValueSchema.optional(),
  })
  .partial()
  .strict()
  .refine((patch) => Object.keys(patch).length > 0, {
    message: "PROMO_CODE_PATCH_EMPTY",
  })
  .refine(
    (patch) => {
      const touchesDiscount =
        "discountPercent" in patch || "discountCents" in patch;

      if (!touchesDiscount) return true;

      return (
        (patch.discountPercent !== null &&
          patch.discountPercent !== undefined &&
          patch.discountCents === null) ||
        (patch.discountPercent === null &&
          patch.discountCents !== null &&
          patch.discountCents !== undefined)
      );
    },
    {
      message: "PROMO_CODE_REQUIRES_EXACTLY_ONE_DISCOUNT_TYPE",
      path: ["discountPercent"],
    }
  )
  .refine(promoCodeDatesAreValid, {
    message: "PROMO_CODE_INVALID_DATE_RANGE",
    path: ["endsAt"],
  });

export type UpdatePromoCodePatch = z.infer<typeof updatePromoCodePatchSchema>;

export const updatePromoCodeInputSchema = z
  .object({
    id: dbPromoCodeBaseSchema.shape.id,
    patch: updatePromoCodePatchSchema,
  })
  .strict();

export type UpdatePromoCodeInput = z.infer<typeof updatePromoCodeInputSchema>;

export const deletePromoCodeInputSchema = z
  .object({
    id: dbPromoCodeBaseSchema.shape.id,
  })
  .strict();

export type DeletePromoCodeInput = z.infer<typeof deletePromoCodeInputSchema>;