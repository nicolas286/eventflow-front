import { z } from "zod";

export const attendeeSchema = z.object({
  id: z.uuid(), 
  orderId: z.uuid(),
  productId: z.uuid().nullable().optional(),
  productNameSnapshot: z.string().min(2, "Le nom du produit est trop court").max(80, "Le nom du produit est trop long"),
  attendeeIndex: z.number().int().min(1, "L'index de l'attendee doit supérieur ou égal à 1").max(500, "L'index de l'attendee est trop grand"),
  createdAt: z.string(),
  status: z.enum(["reserved", "confirmed", "cancelled", "expired"]),
  confirmedAt: z.string().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
  detailsCompletedAt: z.string().nullable().optional(),
  



  slug: z.string().min(3, "Le slug est trop court").max(80, "Le slug est trop long"),
  title: z.string().min(3, "Le titre est trop court").max(120, "Le titre est trop long"),
  description: z.string().max(5000, "La description est trop longue").nullable(),
  location: z.string().max(180, "L'emplacement est trop long").nullable(),
  bannerUrl: z.string().min(5, "L'URL de la bannière est trop courte").max(500, "L'URL de la bannière est trop longue").nullable(),
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),
  isPublished: z.boolean(),
  updatedAt: z.string(),
  depositCents: z.number().int().min(0, "L'acompte doit être positif ou nul").nullable(),
});

export const eventsSchema = z.array(eventSchema);

export type Event = z.infer<typeof eventSchema>;
export type Events = z.infer<typeof eventsSchema>;