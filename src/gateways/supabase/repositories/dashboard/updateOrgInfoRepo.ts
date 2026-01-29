import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseSafe } from "../../supabaseSafe";

import {
  updateOrgInfoPatchSchema,
  type UpdateOrgInfoPatch,
  updateOrgInfoResultSchema,
  type UpdateOrgInfoResult,
} from "../../../../domain/models/admin/admin.updateOrgPatch.schema";

/**
 * updateOrgInfoRepo
 * - RPC public.update_organization(p_input jsonb) -> jsonb
 * - Input = UpdateOrgInfoPatch (camelCase)
 * - RPC attend des clés snake_case (org_id, public_email, ...)
 * - Output = camelCase déjà (selon ta RPC), donc pas de snakeToCamel ici
 */
export function updateOrgInfoRepo(supabase: SupabaseClient) {
  return {
    async updateOrgInfo(input: UpdateOrgInfoPatch): Promise<UpdateOrgInfoResult> {
      const parsed = updateOrgInfoPatchSchema.parse(input);

      // On construit un input RPC minimal en n'envoyant QUE les champs présents
      // (super important car ta RPC utilise `p_input ? 'field'`)
      const rpcInput: Record<string, unknown> = {
        org_id: parsed.orgId,
      };

      if ("type" in parsed) rpcInput.type = parsed.type;
      if ("name" in parsed) rpcInput.name = parsed.name;
      if ("status" in parsed) rpcInput.status = parsed.status;

      if ("description" in parsed) rpcInput.description = parsed.description;
      if ("publicEmail" in parsed) rpcInput.public_email = parsed.publicEmail;
      if ("phone" in parsed) rpcInput.phone = parsed.phone;
      if ("website" in parsed) rpcInput.website = parsed.website;

      const raw = await supabaseSafe(() =>
        supabase.rpc("update_organization", { p_input: rpcInput })
      );

      // raw est déjà camelCase selon ta RPC
      return updateOrgInfoResultSchema.parse(raw);
    },
  };
}
