import { z } from "zod";

/* --------- 📦 get_event_tickets_admin input -------- */

export const getEventTicketsAdminInputSchema = z
  .object({
    p_event_id: z.uuid(),

    p_limit: z
      .number()
      .int()
      .min(1, "limit trop petit")
      .max(1000, "limit trop grand")
      .default(50),

    p_offset: z
      .number()
      .int()
      .min(0, "offset invalide")
      .default(0),
  })
  .strict();

export type GetEventTicketsAdminInput = z.infer<
  typeof getEventTicketsAdminInputSchema
>;