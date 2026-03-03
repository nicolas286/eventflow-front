import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseSafe } from "@gateways/supabase/supabaseSafe";
import { camelToSnake } from "@helpers/camelToSnake";
import { createOrganizationFormSchema,
  createOrganizationResultSchema,
  type CreateOrganizationForm,
  type CreateOrganizationResult
 } from "../schemas/admin.createOrganization.schema";

export function createOrganizationsRepo(supabase: SupabaseClient) {
  return {
    async createOrganization(input: CreateOrganizationForm): Promise<CreateOrganizationResult> {
      const validatedForm = createOrganizationFormSchema.parse(input);

      const rpcArgs = {
        p_input: camelToSnake(validatedForm),
      };

      // RPC returns uuid -> string
      const rawOrgId = await supabaseSafe<string>(
        () => supabase.rpc("create_organization", rpcArgs),
      );

      return createOrganizationResultSchema.parse(rawOrgId);
    },
  };
}
