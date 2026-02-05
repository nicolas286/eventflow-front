import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseSafe } from "../../supabaseSafe";
import { camelToSnake } from "../../../../domain/helpers/camelToSnake";
import { snakeToCamel } from "../../../../domain/helpers/snakeToCamel";
import {
  organizationBillingPatchSchema,
  organizationBillingSchema,
  type OrganizationBilling,
  type OrganizationBillingPatch,
} from "../../../../domain/models/db/db.organizationBilling.schema";

/**
 * Repo: organization billing (front)
 *
 * RPCs:
 * - rpc_get_organization_billing(p_org_id uuid)
 * - rpc_upsert_organization_billing(p_input jsonb)
 */
export function makeOrganizationBillingRepo(supabase: SupabaseClient) {
  return {
    /**
     * Load billing information for an organization.
     * Returns null if billing is not yet configured.
     */
    async getOrganizationBilling(orgId: string): Promise<OrganizationBilling | null> {
      const raw = await supabaseSafe(() =>
        supabase.rpc("rpc_get_organization_billing", {
          p_org_id: orgId,
        })
      );

      const camel = snakeToCamel(raw);

      // RPC returns { orgId, billing: null } when not initialized
      if (
        camel &&
        typeof camel === "object" &&
        "billing" in camel &&
        (camel as any).billing === null
      ) {
        return null;
      }

      return organizationBillingSchema.parse(camel);
    },

    /**
     * Create or update billing information (front-safe patch).
     */
    async upsertOrganizationBilling(
      input: OrganizationBillingPatch
    ): Promise<OrganizationBilling> {
      // 1) Validate front input
      const validatedPatch = organizationBillingPatchSchema.parse(input);

      // 2) Convert to snake_case for RPC
      const rpcInput = camelToSnake(validatedPatch);

      // 3) Call RPC
      const raw = await supabaseSafe(() =>
        supabase.rpc("rpc_upsert_organization_billing", {
          p_input: rpcInput,
        })
      );

      // 4) Normalize + validate result
      const camel = snakeToCamel(raw);
      return organizationBillingSchema.parse(camel);
    },
  };
}
