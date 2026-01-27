import { z } from "zod";

export const eventProductSchema = z.object({
  id: z.uuid(), 
  eventId: z.uuid(),
  name: z.string().min(2, "Le nom du produit est trop court").max(80, "Le nom du produit est trop long"),
  description: z.string().max(500, "La description du produit est trop longue").nullable().optional(),
  priceCents: z.number().int().min(0, "Le prix doit être positif ou nul").max(10000000, "Le prix est trop élevé"),
  currency: z.string().length(3, "Le code devise doit faire 3 caractères"),
  stockQty: z.number().int().min(0, "La quantité en stock doit être positive ou nulle").nullable().optional(),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0, "L'ordre de tri doit être positif ou nul").max(1000, "L'ordre de tri est trop élevé"),
  createsAttendees: z.boolean(),
  attendeesPerUnit: z.number().int().min(1, "Le nombre de participants par unité doit être au moins 1").max(20, "Le nombre de participants par unité est trop élevé"),
  createdAt: z.string(),
  updatedAt: z.string(),
  reservedQty: z.number().int().min(0, "La quantité réservée doit être positive ou nulle"),
  soldQty: z.number().int().min(0, "La quantité vendue doit être positive ou nulle"),
  isGatekeeper: z.boolean(),
  closeEventWhenSoldOut: z.boolean()
});

export const eventProductsSchema = z.array(eventProductSchema);

export type EventProduct = z.infer<typeof eventProductSchema>;
export type EventProducts = z.infer<typeof eventProductsSchema>;
