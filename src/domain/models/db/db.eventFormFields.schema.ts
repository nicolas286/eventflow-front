import { z } from "zod";

const optionLabelSchema = z.string().min(1).max(80);
const optionValueSchema = z.string().min(1).max(80);

export const formFieldOptionsSchema = z.union([
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
  eventId: z.uuid(),
  label: z.string().min(2, "Le label est trop court").max(120, "Le label est trop long"),
  fieldKey: z.string().min(2, "La clé est trop courte").max(50, "La clé est trop longue"),
  fieldType: z.enum(["text", "textarea", "email", "number", "select", "checkbox", "radio", "date", "country", "phone"]), 
  isRequired: z.boolean(),
  options: formFieldOptionsSchema.optional().nullable(),
  sortOrder: z.number().int().min(0, "L'ordre de tri doit être un entier positif").max(1000, "L'ordre de tri est trop grand"),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type EventFormField = z.infer<typeof eventFormFieldSchema>;