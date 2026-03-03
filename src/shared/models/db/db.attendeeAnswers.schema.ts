import { z } from "zod";

export const attendeeAnswersSchema = z.object({
  id: z.uuid(), 
  attendeeId: z.uuid(),
  fieldKeySnapshot: z.string().min(2, "La clé est trop courte").max(50, "La clé est trop longue"),
  fieldTypeSnapshot: z.enum(["text", "textarea", "email", "number", "select", "checkbox", "radio", "date", "country", "phone"]),
  fieldLabelSnapshot: z.string().min(1, "Le label est trop court").max(200, "Le label est trop long"), 
  value: z.string().trim().max(10000).nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),

});

export const attendeesAnswersSchema = z.array(attendeeAnswersSchema);

export type AttendeeAnswers = z.infer<typeof attendeeAnswersSchema>;
export type AttendeesAnswers = z.infer<typeof attendeesAnswersSchema>;