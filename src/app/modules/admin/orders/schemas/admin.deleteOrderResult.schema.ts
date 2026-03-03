import { z } from "zod";

/**
 * RPC: admin_delete_order
 * Expected jsonb:
 * {
 *   deleted_order_id: uuid,
 *   released: {
 *     reserved_units: number,
 *     sold_units: number
 *   }
 * }
 */

export const adminDeleteOrderReleasedSchema = z
  .object({
    reserved_units: z.number().int().nonnegative(),
    sold_units: z.number().int().nonnegative(),
  })
  .strict();

export const adminDeleteOrderResultSchema = z
  .object({
    deleted_order_id: z.uuid(),
    released: adminDeleteOrderReleasedSchema.optional(),
  })
  .strict();

export type AdminDeleteOrderResult = z.infer<typeof adminDeleteOrderResultSchema>;
