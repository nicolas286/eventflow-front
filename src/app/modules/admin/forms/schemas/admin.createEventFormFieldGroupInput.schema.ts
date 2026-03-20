import { z } from "zod";
import { eventFormFieldGroupSchema } from "@shared/models/db/db.eventFormFields.schema";

export const createEventFormFieldGroupInputSchema = eventFormFieldGroupSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateEventFormFieldGroupInput = z.infer<
  typeof createEventFormFieldGroupInputSchema
>;