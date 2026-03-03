import { z } from "zod";

export const adminUpdateOrderAttendeeInputSchema = z.object({
  attendeeId: z.uuid(),

  attendee: z.object({
    email: z.email().optional(),
    phone: z.string().min(6).max(30).optional(),
    firstName: z.string().min(1).max(120).optional(),
    lastName: z.string().min(1).max(120).optional(),
    answers: z.array(
      z.object({
        fieldKey: z.string().min(1).max(50).optional(),
        eventFormFieldId: z.uuid().optional(),
        valueText: z.string().max(10000).optional(),
        valueInt: z.number().int().optional(),
        valueBool: z.boolean().optional(),
        valueDate: z.string().optional(),
        value: z.any().optional(),
      }).refine(v => !!v.fieldKey || !!v.eventFormFieldId, "fieldKey ou eventFormFieldId requis")
    ).optional(),
  }).strict(),
});

export type AdminUpdateOrderAttendeeInput = z.infer<typeof adminUpdateOrderAttendeeInputSchema>;

export const adminUpdateOrderAttendeeResultSchema = z.object({
  attendeeId: z.uuid(),
  updatedAnswersCount: z.number().int().min(0),
});

export type AdminUpdateOrderAttendeeResult = z.infer<typeof adminUpdateOrderAttendeeResultSchema>;
