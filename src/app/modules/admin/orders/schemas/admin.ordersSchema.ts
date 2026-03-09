import { z } from "zod";
import { orderSchema } from "@shared/models/db/db.order.schema";

export const orderUISchema = orderSchema
  .omit({ bookingToken: true })
  .extend({
    publicId: z.string().optional(),
  });

export const ordersUISchema = z.object({
  limit: z.number().int().min(1).max(1000),
  offset: z.number().int().min(0),
  total: z.number().int().min(0),
  rows: z.array(orderUISchema),
});

export type OrderUI = z.infer<typeof orderUISchema>;
export type OrdersUI = z.infer<typeof ordersUISchema>;