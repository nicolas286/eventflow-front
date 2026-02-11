import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseSafe } from "../../supabaseSafe";
import { camelToSnake } from "../../../../domain/helpers/camelToSnake";
import {
  createOrganizationFormSchema,
  createOrganizationResultSchema,
  type CreateOrganizationForm,
  type CreateOrganizationResult,
} from "../../../../domain/models/admin/admin.createOrganization.schema";

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
