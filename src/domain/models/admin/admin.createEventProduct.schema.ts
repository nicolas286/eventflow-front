import { z } from "zod";

/**
 * Input FRONT pour créer un event product
 * (camelCase → conversion snake_case dans le repo)
 */
export const createEventProductSchema = z
  .object({
    eventId: z.uuid(),

    name: z
      .string()
      .trim()
      .min(2, "Le nom du produit est trop court")
      .max(80, "Le nom du produit est trop long"),

    description: z
      .string()
      .trim()
      .max(500, "La description du produit est trop longue")
      .nullable()
      .optional(),

    priceCents: z
      .number()
      .int("Le prix doit être un entier (en cents)")
      .min(0, "Le prix doit être positif ou nul")
      .max(10_000_000, "Le prix est trop élevé"),


    currency: z.literal("EUR").optional(),

    stockQty: z
      .number()
      .int("La quantité doit être un entier")
      .min(0, "La quantité en stock doit être positive ou nulle")
      .nullable()
      .optional(),

    isActive: z.boolean().optional(),

    sortOrder: z
      .number()
      .int("L'ordre doit être un entier")
      .min(0, "L'ordre de tri doit être positif ou nul")
      .max(1000, "L'ordre de tri est trop élevé")
      .optional(),

    createsAttendees: z.boolean().optional(),

    attendeesPerUnit: z
      .number()
      .int("Le nombre doit être un entier")
      .min(1, "Le nombre de participants par unité doit être au moins 1")
      .max(20, "Le nombre de participants par unité est trop élevé")
      .optional(),

    isGatekeeper: z.boolean().optional(),
    closeEventWhenSoldOut: z.boolean().optional(),
  })
  .superRefine((val, ctx) => {
    const creates = val.createsAttendees ?? true;
    if (creates) {
      const apu = val.attendeesPerUnit ?? 1;
      if (apu < 1) {
        ctx.addIssue({
          path: ["attendeesPerUnit"],
          message: "attendeesPerUnit doit être ≥ 1 si createsAttendees = true",
          code: z.ZodIssueCode.custom,
        });
      }
    }

    if (val.closeEventWhenSoldOut && !val.isGatekeeper) {
      ctx.addIssue({
        path: ["closeEventWhenSoldOut"],
        message: "closeEventWhenSoldOut nécessite isGatekeeper = true",
        code: z.ZodIssueCode.custom,
      });
    }
  });

export type CreateEventProductInput = z.infer<
  typeof createEventProductSchema
>;
