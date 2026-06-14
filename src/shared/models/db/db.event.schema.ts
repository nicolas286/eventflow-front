import { z } from "zod";

export const eventSchema = z.object({
  id: z.uuid(), 
  orgId: z.uuid(),
  slug: z.string().min(3, "Le slug est trop court").max(80, "Le slug est trop long"),
  title: z.string().min(3, "Le titre est trop court").max(120, "Le titre est trop long"),
  description: z.string().max(5000, "La description est trop longue").nullable().optional(),
  location: z.string().max(180, "L'emplacement est trop long").nullable().optional(),
  bannerUrl: z.string().min(5, "L'URL de la bannière est trop courte").max(500, "L'URL de la bannière est trop longue").nullable().optional(),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  registrationDeadline: z.string().nullable().optional(),
  isPublished: z.boolean(),
  maxAttendees: z
    .number()
    .int("Le nombre de participants maximal doit être un entier")
    .min(0, "Le nombre de participants maximal ne peut être négatif")
    .nullable()
    .optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  depositCents: z.number().int().min(0, "L'acompte doit être positif ou nul").nullable().optional(),
  
  charterText: z
    .string()
    .max(10000, "La charte est trop longue")
    .nullable()
    .optional(),
});

export const eventsSchema = z.array(eventSchema);

export type Event = z.infer<typeof eventSchema>;
export type Events = z.infer<typeof eventsSchema>;