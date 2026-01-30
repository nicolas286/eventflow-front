import { z } from "zod";

export const updateEventPatchSchema = z
  .object({
    title: z.string().min(3, "Le titre est trop court").max(120, "Le titre est trop long").optional(),
    location: z.string().max(180, "L'emplacement est trop long").nullable().optional(),
    startsAt: z.string().nullable().optional(),
    isPublished: z.boolean().optional(),
  });

  

export type UpdateEventPatch = z.infer<typeof updateEventPatchSchema>;
