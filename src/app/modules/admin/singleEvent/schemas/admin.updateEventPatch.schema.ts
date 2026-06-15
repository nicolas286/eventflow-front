import { z } from "zod";
import { eventDbSchema } from "@shared/models/db/db.event.schema";

export const updateEventPatchSchema = eventDbSchema
  .pick({
    title: true,
    location: true,
    startsAt: true,
    isPublished: true,
  })
  .partial();

export type UpdateEventPatch = z.infer<typeof updateEventPatchSchema>;