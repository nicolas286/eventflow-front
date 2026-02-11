import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseSafe } from "../../supabaseSafe";
import { camelToSnake } from "../../../../domain/helpers/camelToSnake";
import { snakeToCamel } from "../../../../domain/helpers/snakeToCamel";
import {
  organizationBillingPatchSchema,
  organizationBillingSchema,
  organizationBillingEnvelopeSchema,
  type OrganizationBilling,
  type OrganizationBillingPatch,
} from "../../../../domain/models/db/db.organizationBilling.schema";
import { makeOrganizationBillingArgsSchema,
  type MakeOrganizationBillingArgs
 } from "../../../../domain/models/admin/admin.makeOrganizationBillingArgs.schema";

export function makeOrganizationBillingRepo(supabase: SupabaseClient) {
  return {
    async getOrganizationBilling(args: MakeOrganizationBillingArgs): Promise<OrganizationBilling | null> {
      const p_org_id = makeOrganizationBillingArgsSchema.parse(args);

      const raw = await supabaseSafe<unknown>(() =>
        supabase.rpc("rpc_get_organization_billing", { p_org_id }),
      );

      const camel = snakeToCamel(raw);

      const env = organizationBillingEnvelopeSchema.parse(camel);
      return env.billing; 
    },

    async upsertOrganizationBilling(input: OrganizationBillingPatch): Promise<OrganizationBilling> {
      const validatedPatch = organizationBillingPatchSchema.parse(input);
      const rpcInput = camelToSnake(validatedPatch);

      const raw = await supabaseSafe<unknown>(() =>
        supabase.rpc("rpc_upsert_organization_billing", { p_input: rpcInput }),
      );

      const camel = snakeToCamel(raw);
      return organizationBillingSchema.parse(camel);
    },
  };
}
