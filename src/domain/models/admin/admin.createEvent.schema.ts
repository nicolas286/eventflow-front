import { z } from "zod";
import { eventSchema } from "../db/db.event.schema";

export const createEventInputSchema = eventSchema
  .omit({
    id: true,
    slug: true,
    isPublished: true,
    createdAt: true,
    updatedAt: true,
  })
  .superRefine((data, ctx) => {
    const now = Date.now();

    if (data.startsAt) {
      const start = Date.parse(data.startsAt);

      if (Number.isFinite(start) && start < now) {
        ctx.addIssue({
          code: "custom",
          path: ["startsAt"],
          message: "La date de début ne peut pas être dans le passé",
        });
      }
    }

    if (data.endsAt) {
      const end = Date.parse(data.endsAt);

      if (Number.isFinite(end) && end < now) {
        ctx.addIssue({
          code: "custom",
          path: ["endsAt"],
          message: "La date de fin ne peut pas être dans le passé",
        });
      }
    }

    if (data.startsAt && data.endsAt) {
      const start = Date.parse(data.startsAt);
      const end = Date.parse(data.endsAt);

      if (Number.isFinite(start) && Number.isFinite(end) && end < start) {
        ctx.addIssue({
          code: "custom",
          path: ["endsAt"],
          message: "La date de fin doit être postérieure à la date de début",
        });
      }
    }
  });

export type CreateEventInput = z.infer<typeof createEventInputSchema>;