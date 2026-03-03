import { z } from "zod";
import { organizationSchema } from "@shared/models/db/db.organization.schema";


export const createOrganizationFormSchema = organizationSchema
  .pick({
    type: true,
    name: true,
  })
  .strict();

export type CreateOrganizationForm = z.infer<typeof createOrganizationFormSchema>;

export const createOrganizationRpcInputSchema = z
  .object({
    type: createOrganizationFormSchema.shape.type,
    name: createOrganizationFormSchema.shape.name,
  })
  .strict();

export type CreateOrganizationRpcInput = z.infer<typeof createOrganizationRpcInputSchema>;

export const createOrganizationRpcArgsSchema = z
  .object({
    p_input: createOrganizationRpcInputSchema,
  })
  .strict();

export type CreateOrganizationRpcArgs = z.infer<typeof createOrganizationRpcArgsSchema>;

export const createOrganizationResultSchema = z.uuid();

export type CreateOrganizationResult = z.infer<typeof createOrganizationResultSchema>;