import { z } from "zod";

export const adminAddOrderAttendeeInputSchema = z.object({
  orderId: z.uuid(),
  eventProductId: z.uuid(),
  attendee: z
    .object({
      email: z.email().optional(),
      phone: z.string().min(6).max(30).optional(),
      firstName: z.string().min(1).max(120).optional(),
      lastName: z.string().min(1).max(120).optional(),
      answers: z
        .array(
          z
            .object({
              fieldKey: z.string().min(1).max(50).optional(),
              eventFormFieldId: z.uuid().optional(),
              valueText: z.string().max(10000).optional(),
              valueInt: z.number().int().optional(),
              valueBool: z.boolean().optional(),
              valueDate: z.string().optional(),
              value: z.any().optional(), 
            })
            .refine(
              (v) => !!v.fieldKey || !!v.eventFormFieldId,
              "fieldKey ou eventFormFieldId requis"
            )
        )
        .optional(),
    })
    .strict(),
  markPaid: z.boolean().optional(),
});

export type AdminAddOrderAttendeeInput = z.infer<
  typeof adminAddOrderAttendeeInputSchema
>;

export const adminAddOrderAttendeeResultSchema = z.object({
  orderId: z.uuid(),
  attendeeId: z.uuid(),
  orderItemId: z.uuid(),
  addedPriceCents: z.number().int(),
  currency: z.string().length(3),
  markPaid: z.boolean(),
  newTotalCents: z.number().int(),
  newPaidCents: z.number().int(),
  newStatus: z.enum(["pending", "awaiting_payment", "partially_paid", "expired", "canceled", "paid"]),
});

export type AdminAddOrderAttendeeResult = z.infer<
  typeof adminAddOrderAttendeeResultSchema
>;
