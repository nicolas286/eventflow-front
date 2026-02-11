import { z } from "zod";

export const adminOrderStep2Schema = z
  .object({
    buyerEmail: z.email("Email invalide").max(254, "Email trop long"),
    markPaid: z.boolean(),
    payMode: z.enum(["deposit", "full", "custom"]),
    customAmountCents: z.union([z.number().int().min(1).max(50_000_000), z.literal("")]),
    paymentMethod: z.enum(["cash", "bank", "card", "other"]),
    note: z.string().trim().max(2000),
  })
  .superRefine((v, ctx) => {
    if (v.markPaid && v.payMode === "custom") {
      if (v.customAmountCents === "" || typeof v.customAmountCents !== "number") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Montant requis en mode personnalisé.",
          path: ["customAmountCents"],
        });
      }
    }
  });

export type AdminOrderStep2Input = z.infer<typeof adminOrderStep2Schema>;
