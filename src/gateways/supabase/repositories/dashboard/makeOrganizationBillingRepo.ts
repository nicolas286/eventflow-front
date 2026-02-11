import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { supabaseSafe } from "../../supabaseSafe";
import {
  organizationBillingPatchSchema,
  organizationBillingSchema,
  type OrganizationBilling,
  type OrganizationBillingPatch,
} from "../../../../domain/models/db/db.organizationBilling.schema";
import { camelToSnake } from "../../../../domain/helpers/camelToSnake";

const orgIdSchema = z.string().uuid();

function unwrapRpc(raw: unknown): unknown {
  if (Array.isArray(raw)) return raw[0] ?? null;
  if (typeof raw === "string") {
    try { return JSON.parse(raw); } catch { return raw; }
  }
  return raw;
}

export function makeOrganizationBillingRepo(supabase: SupabaseClient) {
  return {
    async getOrganizationBilling(orgId: string): Promise<OrganizationBilling | null> {
      const p_org_id = orgIdSchema.parse(orgId);

      const raw = await supabaseSafe<unknown>(() =>
        supabase.rpc("rpc_get_organization_billing", { p_org_id }),
      );

      const parsed = unwrapRpc(raw);
      if (parsed == null) return null;

      return organizationBillingSchema.parse(parsed);
    },

    async upsertOrganizationBilling(input: OrganizationBillingPatch): Promise<OrganizationBilling> {
      const validated = organizationBillingPatchSchema.parse(input);
      const p_input = camelToSnake(validated);

      const raw = await supabaseSafe<unknown>(() =>
        supabase.rpc("rpc_upsert_organization_billing", { p_input }),
      );

      const parsed = unwrapRpc(raw);
      return organizationBillingSchema.parse(parsed);
    },
  };
}
