import { z } from "zod";

export const planLimitsSchema = z.object({
  plan: z.enum(["free", "pro", "starter"]).nullable(),
  maxEventsPerYear: z.number().int().nullable(),
  maxRegistrationsPerEvent: z.number().int().nullable(),
  maxProductsPerEvent: z.number().int().nullable(),
  maxFormFields: z.number().int().nullable(),
  maxAdmins: z.number().int().nullable(),
  brandingRequired: z.boolean(),
  customDomainAllowed: z.boolean(),
  apiAccess: z.boolean(),
  advancedAnalytics: z.boolean(),
  promoCodes: z.boolean(),
  automatedEmails: z.boolean(),
});

export type PlanLimits = z.infer<typeof planLimitsSchema>;