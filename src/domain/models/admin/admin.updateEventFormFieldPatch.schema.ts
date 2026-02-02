import { z } from "zod";
import { eventFormFieldSchema } from "../db/db.eventFormFields.schema";

export const updateEventFormFieldPatchSchema = z.object({
  id: eventFormFieldSchema.shape.id,

  label: eventFormFieldSchema.shape.label.optional(),
  fieldKey: eventFormFieldSchema.shape.fieldKey.optional(),
  fieldType: eventFormFieldSchema.shape.fieldType.optional(),

  isRequired: eventFormFieldSchema.shape.isRequired.optional(),
  isActive: eventFormFieldSchema.shape.isActive.optional(),

  sortOrder: eventFormFieldSchema.shape.sortOrder.optional(),
  options: eventFormFieldSchema.shape.options.optional().nullable(),
});

export type UpdateEventFormFieldPatch = z.infer<
  typeof updateEventFormFieldPatchSchema
>;
