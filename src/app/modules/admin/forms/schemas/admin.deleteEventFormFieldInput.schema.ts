import { z } from "zod";

export const deleteEventFormFieldInputSchema = z.object({
  id: z.uuid(),
});

export type DeleteEventFormFieldInput = z.infer<typeof deleteEventFormFieldInputSchema>;
