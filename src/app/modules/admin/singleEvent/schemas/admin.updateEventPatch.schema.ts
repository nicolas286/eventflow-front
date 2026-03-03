import { z } from "zod";

export const updateEventPatchSchema = z
  .object({
    title: z
      .string()
      .min(3, "Le titre est trop court")
      .max(120, "Le titre est trop long")
      .optional(),

    location: z
      .string()
      .min(3, "L'emplacement est trop court")
      .max(180, "L'emplacement est trop long")
      .nullable()
      .optional(),

    startsAt: z.string().nullable().optional(),

    isPublished: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
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
  });

export type UpdateEventPatch = z.infer<typeof updateEventPatchSchema>;