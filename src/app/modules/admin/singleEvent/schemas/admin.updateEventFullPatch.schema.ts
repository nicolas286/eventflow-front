import { z } from "zod";

const dateNullable = z.string().nullable().optional();

export const updateEventFullPatchSchema = z
  .object({
    title: z
      .string()
      .min(3, "Le titre est trop court")
      .max(120, "Le titre est trop long")
      .optional(),

    description: z.string().max(5000, "La description est trop longue").nullable().optional(),

    location: z.string().max(180, "L'emplacement est trop long").nullable().optional(),

    bannerUrl: z.string().nullable().optional(),

    startsAt: dateNullable,
    endsAt: dateNullable,

    isPublished: z.boolean().optional(),
    depositCents: z.number().int().min(0, "L’acompte doit être ≥ 0").max(10_000_000).optional(),
  })
  .superRefine((data, ctx) => {
    const now = Date.now();

    // startsAt pas dans le passé (si fourni et non null)
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

    // endsAt pas dans le passé (si fourni et non null)
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

    // cohérence fin >= début (uniquement si les deux sont fournis et non null)
    if (typeof data.startsAt === "string" && typeof data.endsAt === "string") {
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

export type UpdateEventFullPatch = z.infer<typeof updateEventFullPatchSchema>;