import { z } from "zod";

export const updateEventPatchSchema = z
  .object({
    title: z.string().min(3, "Le titre est trop court").max(120, "Le titre est trop long").optional(),
    location: z.string().max(180, "L'emplacement est trop long").nullable().optional(),
    startsAt: z.string().nullable().optional(),
    endsAt: z.string().nullable().optional(),
    isPublished: z.boolean().optional(),
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

export type UpdateEventPatch = z.infer<typeof updateEventPatchSchema>;
