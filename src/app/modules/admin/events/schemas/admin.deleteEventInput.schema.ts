import { z } from "zod";

export const deleteEventInputSchema = z.object({
  eventId: z.uuid(),
  orgId: z.uuid().optional(),
});

export type DeleteEventInput = z.infer<typeof deleteEventInputSchema>;