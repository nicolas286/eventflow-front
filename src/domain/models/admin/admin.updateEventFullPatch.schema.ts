import { z } from "zod";

const dateNullable = z.string().nullable().optional();

export const updateEventFullPatchSchema = z.object({
  title: z.string().min(3, "Le titre est trop court").max(120, "Le titre est trop long").optional(),

  description: z.string().max(5000, "La description est trop longue").nullable().optional(),

  location: z.string().max(180, "L'emplacement est trop long").nullable().optional(),

  bannerUrl: z.string().nullable().optional(),

  startsAt: dateNullable,
  endsAt: dateNullable,

  isPublished: z.boolean().optional(),
  depositCents: z.number().int().min(0, "L’acompte doit être ≥ 0").max(10_000_000).optional(),
});

export type UpdateEventFullPatch = z.infer<typeof updateEventFullPatchSchema>;
