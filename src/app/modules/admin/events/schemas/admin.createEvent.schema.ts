import { z } from "zod";
import {
  eventDbSchema,
  validateEventDateConsistency,
} from "@shared/models/db/db.event.schema";

function validateEventDatesNotInPast(
  data: {
    startsAt?: string | null;
    endsAt?: string | null;
  },
  ctx: z.RefinementCtx
) {
  const now = Date.now();

  if (typeof data.startsAt === "string") {
    const start = Date.parse(data.startsAt);

    if (Number.isFinite(start) && start < now) {
      ctx.addIssue({
        code: "custom",
        path: ["startsAt"],
        message: "La date de début ne peut pas être dans le passé",
      });
    }
  }

  if (typeof data.endsAt === "string") {
    const end = Date.parse(data.endsAt);

    if (Number.isFinite(end) && end < now) {
      ctx.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "La date de fin ne peut pas être dans le passé",
      });
    }
  }
}

export const createEventInputSchema = eventDbSchema
  .omit({
    id: true,
    slug: true,
    isPublished: true,
    createdAt: true,
    updatedAt: true,
  })
  .superRefine(validateEventDateConsistency)
  .superRefine(validateEventDatesNotInPast);

export type CreateEventInput = z.infer<typeof createEventInputSchema>;