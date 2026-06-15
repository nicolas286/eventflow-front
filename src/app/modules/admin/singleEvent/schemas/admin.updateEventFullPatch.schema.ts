import { z } from "zod";
import {
  eventDbSchema,
  validateEventDateConsistency,
} from "@shared/models/db/db.event.schema";

export const updateEventFullPatchSchema = eventDbSchema
  .pick({
    title: true,
    description: true,
    charterText: true,
    location: true,
    bannerUrl: true,
    startsAt: true,
    endsAt: true,
    registrationDeadline: true,
    maxAttendees: true,
    isPublished: true,
    depositCents: true,
  })
  .partial()
  .superRefine(validateEventDateConsistency);

export type UpdateEventFullPatch = z.infer<typeof updateEventFullPatchSchema>;