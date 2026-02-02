import { z } from "zod";
import { eventFormFieldSchema } from "../db/db.eventFormFields.schema";

export const createEventFormFieldInputSchema = eventFormFieldSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
}); 

export type CreateEventFormFieldInput = z.infer<typeof createEventFormFieldInputSchema>;

