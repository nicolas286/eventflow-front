import { z } from "zod";
import { eventFormFieldGroupSchema } from "@shared/models/db/db.eventFormFields.schema";

export const updateEventFormFieldGroupPatchSchema = z.object({
  id: eventFormFieldGroupSchema.shape.id,

  label: eventFormFieldGroupSchema.shape.label.optional(),
  sortOrder: eventFormFieldGroupSchema.shape.sortOrder.optional(),
  isActive: eventFormFieldGroupSchema.shape.isActive.optional(),
});

export type UpdateEventFormFieldGroupPatch = z.infer<
  typeof updateEventFormFieldGroupPatchSchema
>;