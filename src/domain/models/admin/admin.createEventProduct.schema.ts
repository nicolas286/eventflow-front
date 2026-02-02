import { z } from "zod";
import { eventProductSchema } from "../db/db.eventProducts.schema";

/**
 * Input FRONT pour créer un event product
 * (camelCase → conversion snake_case dans le repo)
 */

export const createEventProductSchema = eventProductSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  reservedQty: true,
  soldQty: true
}); 

export type CreateEventProductInput = z.infer<typeof createEventProductSchema>;
