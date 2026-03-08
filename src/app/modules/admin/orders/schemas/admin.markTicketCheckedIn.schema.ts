import { z } from "zod";

/* --------- 📦 mark_ticket_checked_in input -------- */

export const markTicketCheckedInInputSchema = z
  .object({
    p_ticket_id: z.uuid(),
  })
  .strict();

export type MarkTicketCheckedInInput = z.infer<
  typeof markTicketCheckedInInputSchema
>;

/* --------- 📦 mark_ticket_checked_in response -------- */

const isoDateSchema = z.string().datetime({ offset: true });

export const markTicketCheckedInResponseSchema = z
  .object({
    ok: z.literal(true),
    ticketId: z.uuid(),
    eventId: z.uuid(),
    orderId: z.uuid(),
    ticketIndex: z.number().int().min(1),
    qrToken: z.string().trim().min(1),
    status: z.string().trim().min(1),
    checkedInAt: isoDateSchema,
    checkedInBy: z.uuid(),
  })
  .strict();

export type MarkTicketCheckedInResponse = z.infer<
  typeof markTicketCheckedInResponseSchema
>;