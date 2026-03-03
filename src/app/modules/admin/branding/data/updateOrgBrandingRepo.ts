import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseSafe } from "@gateways/supabase/supabaseSafe";
import { snakeToCamel } from "@helpers/snakeToCamel";
import { camelToSnake } from "@helpers/camelToSnake";

import {
  orgBrandingSchema,
  updateOrgBrandingInputSchema,
  type OrgBranding,
  type UpdateOrgBrandingInput,
} from "../schemas/admin.orgBranding.schema";

export function updateOrgBrandingRepo(supabase: SupabaseClient) {
  return {
    async updateOrgBranding(input: UpdateOrgBrandingInput): Promise<OrgBranding> {
      const parsed = updateOrgBrandingInputSchema.parse(input);
      const dbPatch = camelToSnake(parsed.patch);

      const raw = await supabaseSafe(() =>
        supabase
          .from("organization_profile")
          .update(dbPatch)
          .eq("org_id", parsed.orgId)
          .select("org_id, display_name, primary_color, logo_url, default_event_banner_url")
          .single()
      );

      const camel = snakeToCamel(raw);
      return orgBrandingSchema.parse(camel);
    },
  };
}
