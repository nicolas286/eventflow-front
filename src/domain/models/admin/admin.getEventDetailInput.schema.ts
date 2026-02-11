import { z } from "zod";

/**
 * get_event_detail_admin (RPC) — args
 *
 * Two modes:
 * 1) By slug:
 *    { p_org_id, p_event_slug, p_orders_limit, p_orders_offset, p_attendees_limit, p_attendees_offset }
 * 2) By id:
 *    { p_event_id, p_orders_limit, p_orders_offset, p_attendees_limit, p_attendees_offset }
 */

const intNonNeg = z.number().int().nonnegative();

export const getEventDetailAdminPagingSchema = z.object({
  p_orders_limit: intNonNeg.default(50),
  p_orders_offset: intNonNeg.default(0),
  p_attendees_limit: intNonNeg.default(50),
  p_attendees_offset: intNonNeg.default(0),
});

export const getEventDetailAdminArgsBySlugSchema = getEventDetailAdminPagingSchema
  .extend({
    p_org_id: z.uuid(),
    p_event_slug: z.string().min(1),
  })
  .strict();

export const getEventDetailAdminArgsByIdSchema = getEventDetailAdminPagingSchema
  .extend({
    p_event_id: z.uuid(),
  })
  .strict();

export const getEventDetailAdminRpcArgsSchema = z.union([
  getEventDetailAdminArgsBySlugSchema,
  getEventDetailAdminArgsByIdSchema,
]);

export type GetEventDetailAdminRpcArgsBySlug = z.infer<typeof getEventDetailAdminArgsBySlugSchema>;
export type GetEventDetailAdminRpcArgsById = z.infer<typeof getEventDetailAdminArgsByIdSchema>;
export type GetEventDetailAdminRpcArgs = z.infer<typeof getEventDetailAdminRpcArgsSchema>;
