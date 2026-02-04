import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseSafe } from "../../supabaseSafe";
import { camelToSnake } from "../../../../domain/helpers/camelToSnake";
import {
  createOrganizationRpcArgsSchema,
  createOrganizationFormSchema,
  createOrganizationResultSchema,
  type CreateOrganizationForm,
  type CreateOrganizationResult,
} from "../../../../domain/models/admin/admin.createOrganization.schema";

/**
 * Repo: create organization via RPC
 * RPC expected: supabase.rpc("create_organization", { p_input: { type, name } })
 * Returns: uuid (org_id)
 */
export function createOrganizationsRepo(supabase: SupabaseClient) {
  return {
    async createOrganization(input: CreateOrganizationForm): Promise<CreateOrganizationResult> {
      const validatedForm = createOrganizationFormSchema.parse(input);


      const rpcInput = camelToSnake(validatedForm);

      const rpcArgs = createOrganizationRpcArgsSchema.parse({
        p_input: rpcInput,
      });

      const raw = await supabaseSafe(() =>
        supabase.rpc("create_organization", rpcArgs)
      );

      return createOrganizationResultSchema.parse(raw);
    },
  };
}
