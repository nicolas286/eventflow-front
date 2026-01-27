import { z } from "zod";

const optionLabelSchema = z.string().min(1).max(80);
const optionValueSchema = z.string().min(1).max(80);

export const publicFormFieldOptionsSchema = z.union([
  z.array(optionLabelSchema).min(1).max(100),
  z.array(
    z.object({
      label: optionLabelSchema,
      value: optionValueSchema,
    })
  ).min(1).max(100),
  z.record(
    z.string().min(1).max(80),
    z.any()
  ),
  z.null(),
]);

export const eventFormFieldSchema = z.object({
  id: z.uuid(),
  label: z.string().min(1),
  fieldKey: z.string().min(1),
  fieldType: z.string().min(1), 
  isRequired: z.boolean(),
  options: publicFormFieldOptionsSchema.optional().nullable(),
  sortOrder: z.number().int(),
});