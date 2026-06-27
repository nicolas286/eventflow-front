import { z } from "zod";
import { eventFormFieldSchema } from "@shared/models/db/db.eventFormFields.schema";

export const createEventFormFieldInputSchema = eventFormFieldSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .superRefine((data, ctx) => {
    if (!/^[a-z][a-z0-9_]*$/.test(data.fieldKey)) {
      ctx.addIssue({
        code: "custom",
        path: ["fieldKey"],
        message:
          "La clé doit commencer par une lettre minuscule et ne contenir que des lettres, chiffres ou underscores.",
      });
    }

    const needsOptions =
      data.fieldType === "select" || data.fieldType === "radio";

    if (needsOptions) {
      if (!Array.isArray(data.options) || data.options.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["options"],
          message: "Au moins une option est requise.",
        });
      }
    } else if (data.options != null) {
      ctx.addIssue({
        code: "custom",
        path: ["options"],
        message: "Les options ne sont autorisées que pour les champs select et radio.",
      });
    }
  });

export type CreateEventFormFieldInput = z.infer<typeof createEventFormFieldInputSchema>;

