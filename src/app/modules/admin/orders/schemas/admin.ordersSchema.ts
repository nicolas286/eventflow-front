import { z } from "zod";
import { orderSchema } from "@shared/models/db/db.order.schema";

export const promoRedemptionUISchema = z
  .object({
    id: z.uuid(),
    promoCodeId: z.uuid(),
    code: z.string().nullable(),
    discountCents: z.number().int().min(0),
    createdAt: z.string(),
  })
  .nullable();

export const orderUISchema = orderSchema
  .omit({ bookingToken: true })
  .extend({
    publicId: z.string().optional(),

    discountCents: z.number().int().min(0).default(0),
    dueCents: z.number().int().min(0).default(0),
    promoRedemption: promoRedemptionUISchema.optional().default(null),
  });

export const ordersUISchema = z.object({
  limit: z.number().int().min(1).max(1000),
  offset: z.number().int().min(0),
  total: z.number().int().min(0),
  rows: z.array(orderUISchema),
});

export type PromoRedemptionUI = z.infer<typeof promoRedemptionUISchema>;
export type OrderUI = z.infer<typeof orderUISchema>;
export type OrdersUI = z.infer<typeof ordersUISchema>;