import { z } from "zod";

export const duplicateEventInputSchema = z
  .object({
    sourceEventId: z.uuid(),
    title: z.string().trim().min(1).max(120).optional(),
  })
  .strict();

export type DuplicateEventInput = z.infer<typeof duplicateEventInputSchema>;