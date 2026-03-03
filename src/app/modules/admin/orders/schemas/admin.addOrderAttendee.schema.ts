import { z } from "zod";

const attendeeSchema = z
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
          .refine((v) => !!v.fieldKey || !!v.eventFormFieldId, "fieldKey ou eventFormFieldId requis")
      )
      .optional(),
  })
  .strict();

export const adminAddOrderAttendeeInputSchema = z
  .object({
    orderId: z.uuid(),
    eventProductId: z.uuid(),

    attendee: attendeeSchema.optional(),

    attendees: z.array(attendeeSchema).min(1).optional(),

    markPaid: z.boolean().optional(),
  })
  .superRefine((val, ctx) => {
    const hasSingle = !!val.attendee;
    const hasBulk = Array.isArray(val.attendees);

    if (hasSingle === hasBulk) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Il faut fournir soit attendee, soit attendees (et pas les deux).",
        path: ["attendee"],
      });
    }
  });

  const baseOrderResultSchema = z.object({
  orderId: z.uuid(),
  orderItemId: z.uuid(),
  addedPriceCents: z.number().int(),
  currency: z.string().length(3),
  markPaid: z.boolean(),
  newTotalCents: z.number().int(),
  newPaidCents: z.number().int(),
  newStatus: z.enum(["pending", "awaiting_payment", "partially_paid", "expired", "canceled", "paid"]),
});

export const adminAddOrderAttendeeResultSchema = z.union([
  // single RPC
  baseOrderResultSchema.extend({
    attendeeId: z.uuid(),
  }),

  // bulk RPC (1 unit => N attendees)
  baseOrderResultSchema.extend({
    attendeeIds: z.array(z.uuid()).min(1),
    attendeesPerUnit: z.number().int().min(1).optional(),
    createdAttendeesCount: z.number().int().min(1).optional(),
    eventProductId: z.uuid().optional(),
  }),
]);

export type AdminAddOrderAttendeeResult = z.infer<typeof adminAddOrderAttendeeResultSchema>;
export type AdminAddOrderAttendeeInput = z.infer<typeof adminAddOrderAttendeeInputSchema>;
