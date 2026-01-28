import { z } from "zod";

export const orderItemSchema = z.object({
  id: z.uuid(), 
  orderId: z.uuid(),
  productId: z.uuid().optional().nullable(),
  productNameSnapshot: z.string().min(2, "Le nom du produit est trop court").max(80, "Le nom du produit est trop long"),
  unitPriceCentsSnapshot: z.number().int().min(0, "Le prix doit être positif ou nul").max(10000000, "Le prix est trop élevé"),
  quantity: z.number().int().min(0, "La quantité en stock doit être positive ou nulle").nullable().optional(),
  createdAt: z.string(),
});

export const orderItemsSchema = z.array(orderItemSchema);

export type OrderItem = z.infer<typeof orderItemSchema>;
export type OrderItems = z.infer<typeof orderItemsSchema>;