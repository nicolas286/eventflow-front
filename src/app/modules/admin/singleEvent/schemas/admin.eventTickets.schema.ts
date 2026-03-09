import { z } from "zod";

/* ---------------- shared primitives ---------------- */

const uuidSchema = z.uuid();

const isoDateSchema = z.string().datetime({ offset: true });

const nullableIsoDateSchema = z.union([
  isoDateSchema,
  z.null(),
]);

/* ---------------- ticket row ---------------- */

export const adminEventTicketRowSchema = z
  .object({
    id: uuidSchema,
    orderId: uuidSchema,
    orderItemId: uuidSchema,

    productId: uuidSchema,
    productNameSnapshot: z.string().trim().min(1),
    unitPriceCentsSnapshot: z.number().int().min(0),

    ticketIndex: z.number().int().min(1),
    reference: z.string().trim().min(1),
    qrToken: z.string().trim().min(1),

    status: z.string().trim().min(1),
    checkedInAt: nullableIsoDateSchema,
    createdAt: isoDateSchema,

    createsAttendees: z.boolean(),
    admitsCount: z.number().int().min(1),

    orderCreatedAt: isoDateSchema,
    buyerEmail: z.string().trim().email().nullable().or(z.literal("")),

    attendeeSummaryLines: z.array(z.string().trim().min(1)).default([]),
  })
  .strict();

export type AdminEventTicketRow = z.infer<typeof adminEventTicketRowSchema>;

/* ---------------- paginated payload ---------------- */

export const adminEventTicketsPayloadSchema = z
  .object({
    limit: z.number().int().min(1).max(1000),
    offset: z.number().int().min(0),
    total: z.number().int().min(0),
    rows: z.array(adminEventTicketRowSchema),
  })
  .strict();

export type AdminEventTicketsPayload = z.infer<typeof adminEventTicketsPayloadSchema>;

/* ---------------- rpc response ---------------- */

export const getEventTicketsAdminResponseSchema = z
  .object({
    tickets: adminEventTicketsPayloadSchema,
  })
  .strict();

export type GetEventTicketsAdminResponse = z.infer<typeof getEventTicketsAdminResponseSchema>;