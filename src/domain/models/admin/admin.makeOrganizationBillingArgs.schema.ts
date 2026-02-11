import { z } from "zod";

export const makeOrganizationBillingArgsSchema = z.object({
  id: z.uuid(),
});

export type MakeOrganizationBillingArgs = z.infer<typeof makeOrganizationBillingArgsSchema>;
