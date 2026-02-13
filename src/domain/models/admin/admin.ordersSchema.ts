import { z } from "zod";
import { orderSchema } from "../db/db.order.schema";

export const orderUISchema = orderSchema.omit({bookingToken: true});

export const ordersUISchema = z.object({
    limit: z.number(),
    offset: z.number(),
    rows: z.array(orderUISchema), 
})

export type OrderUI = z.infer<typeof orderUISchema>;


