import { z } from "zod";

export const subscriptionSchema = z.object({
  orgId: z.uuid(), 
  provider: z.enum(["mollie"]),
  mollieCustomerId: z.string().max(100, "L'ID client Mollie est trop long").nullable(),
  mollieSubscriptionId: z.string().max(100, "L'ID d'abonnement Mollie est trop long").nullable(),
  currentPeriodEnd: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  plan: z.enum(["free", "pro", "starter"]).nullable(),
  
});

export type Subscription = z.infer<typeof subscriptionSchema>;