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
  canceledAt: z.string().nullable().optional(),
});


export const attendeesSchema = z.array(attendeeSchema);

export type Attendee = z.infer<typeof attendeeSchema>;
export type Attendees = z.infer<typeof attendeesSchema>;