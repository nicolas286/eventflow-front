import { z } from "zod";
import { eventProductSchema } from "@shared/models/db/db.eventProducts.schema";

export const createEventProductSchema = eventProductSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  reservedQty: true,
  soldQty: true
}); 

export type CreateEventProductInput = z.infer<typeof createEventProductSchema>;
