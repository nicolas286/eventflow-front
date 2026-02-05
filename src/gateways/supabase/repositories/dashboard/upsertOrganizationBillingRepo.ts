import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseSafe } from "../../supabaseSafe";
import { camelToSnake } from "../../../../domain/helpers/camelToSnake";
import {
  organizationBillingPatchSchema,
  organizationBillingSchema,
  type OrganizationBilling,
  type OrganizationBillingPatch,
} from "../../../../domain/models/db/db.organizationBilling.schema";

/**
 * Repo: upsert organization billing via RPC (front-safe)
 * RPC: supabase.rpc("rpc_upsert_organization_billing", { p_input: { ... } })
 * Returns: OrganizationBilling
 */
export function organizationBillingRepo(supabase: SupabaseClient) {
  return {
    async upsertOrganizationBilling(input: OrganizationBillingPatch): Promise<OrganizationBilling> {
      // 1) Validate the patch (front-safe: forbids vat validation flags, enforces constraints)
      const validatedPatch = organizationBillingPatchSchema.parse(input);

      // 2) RPC expects snake_case keys
      const rpcInput = camelToSnake(validatedPatch);

      // 3) Supabase RPC args
      const rpcArgs = { p_input: rpcInput };

      // 4) Call
      const raw = await supabaseSafe(() => supabase.rpc("rpc_upsert_organization_billing", rpcArgs));

      // 5) Validate response
      return organizationBillingSchema.parse(raw);
    },
  };
}
