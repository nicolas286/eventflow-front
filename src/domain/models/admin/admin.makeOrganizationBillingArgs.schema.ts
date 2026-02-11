import { z } from "zod";

export const makeOrganizationBillingArgsSchema = z.object({
  orgId: z.uuid(),
});

export type MakeOrganizationBillingArgs = z.infer<typeof makeOrganizationBillingArgsSchema>;
