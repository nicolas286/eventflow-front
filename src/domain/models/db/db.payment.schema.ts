import { z } from "zod";

export const paymentSchema = z.object({
  id: z.uuid(), 
  orderId: z.uuid(),
  provider: z.enum(["mollie"]),
  providerPaymentId: z.string().min(3, "L'id paiement est trop court").max(100, "L'id paiement est trop long"),
  amountCents: z.number().int().min(0, "Le montant doit être positif ou nul").max(10000000, "Le montant est trop élevé"),
  currency: z.string().length(3, "Le code devise doit faire 3 caractères"),
  status: z.enum(["created", "pending", "failed", "expired", "open", "authorized"]),
  isRefund: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  processedAt: z.string().optional().nullable(),
  raw: z.string().max(1000).optional().nullable(),
  type: z.enum(["payment", "refund"]),
  parentPaymentId: z.uuid().optional().nullable(),
});

export const paymentsSchema = z.array(paymentSchema);

export type Payment = z.infer<typeof paymentSchema>;
export type Payments = z.infer<typeof paymentsSchema>;