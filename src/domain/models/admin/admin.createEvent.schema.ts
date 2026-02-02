import { z } from "zod";
import { eventSchema } from "../db/db.event.schema";

export const createEventInputSchema = eventSchema.omit({
  id: true,
  slug: true,
  isPublished: true,
  createdAt: true,
  updatedAt: true
})
  .superRefine((data, ctx) => {
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
