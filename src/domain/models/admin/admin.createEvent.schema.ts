import { z } from "zod";
import { eventSchema } from "../db/db.event.schema";

export const createEventInputSchema = z
  .object({
    orgId: eventSchema.shape.orgId,

    title: z
      .string()
      .min(3, "Le titre est trop court")
      .max(120, "Le titre est trop long"),

    description: z
      .string()
      .max(5000, "La description est trop longue")
      .nullable()
      .optional(),

    location: z
      .string()
      .max(180, "L'emplacement est trop long")
      .nullable()
      .optional(),

    bannerUrl: z
      .string()
      .max(500, "L'URL de la bannière est trop longue")
      .nullable()
      .optional(),

    depositCents: z
      .number()
      .int("L'acompte doit être un entier")
      .min(0, "L'acompte doit être positif ou nul")
      .nullable()
      .optional(),

    startsAt: z.string().nullable().optional(),
    endsAt: z.string().nullable().optional(),
  })
  .superRefine((data, ctx) => {
  if (data.startsAt && data.endsAt) {
    const start = Date.parse(data.startsAt);
    const end = Date.parse(data.endsAt);

    if (Number.isFinite(start) && Number.isFinite(end) && end < start) {
      ctx.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "La date de fin doit être postérieure à la date de début",
      });
    }
  }
});


export type CreateEventInput = z.infer<typeof createEventInputSchema>;
