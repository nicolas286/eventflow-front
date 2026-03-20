import { z } from "zod";

export const deleteEventFormFieldGroupInputSchema = z.object({
  id: z.uuid(),
});

export type DeleteEventFormFieldGroupInput = z.infer<
  typeof deleteEventFormFieldGroupInputSchema
>;