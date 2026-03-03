import { z } from "zod";

export const deleteEventProductInputSchema = z.object({
  id: z.uuid(),
});

export type DeleteEventProductInput = z.infer<typeof deleteEventProductInputSchema>;
