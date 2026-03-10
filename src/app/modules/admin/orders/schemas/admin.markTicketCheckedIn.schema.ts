import { z } from "zod";

/* --------- 📦 shared response -------- */

const isoDateSchema = z.string().datetime({ offset: true });

export const ticketCheckInResponseSchema = z
  .object({
    ok: z.literal(true),
    outcome: z.literal("validated").or(z.literal("already_checked")),
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

export type TicketCheckInResponse = z.infer<typeof ticketCheckInResponseSchema>;

/* --------- 📦 mark_ticket_checked_in input -------- */

export const markTicketCheckedInInputSchema = z
  .object({
    p_ticket_id: z.uuid(),
  })
  .strict();

export type MarkTicketCheckedInInput = z.infer<
  typeof markTicketCheckedInInputSchema
>;

export const markTicketCheckedInResponseSchema = ticketCheckInResponseSchema;

export type MarkTicketCheckedInResponse = TicketCheckInResponse;

/* --------- 📦 mark_ticket_checked_in_by_qr input -------- */

export const markTicketCheckedInByQrInputSchema = z
  .object({
    p_qr_token: z.string().trim().min(1, "Le token QR est requis."),
  })
  .strict();

export type MarkTicketCheckedInByQrInput = z.infer<
  typeof markTicketCheckedInByQrInputSchema
>;

export const markTicketCheckedInByQrResponseSchema = ticketCheckInResponseSchema;

export type MarkTicketCheckedInByQrResponse = TicketCheckInResponse;