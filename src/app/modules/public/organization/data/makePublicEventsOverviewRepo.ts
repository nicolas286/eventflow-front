import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseSafe } from "@gateways/supabase/supabaseSafe";
import { snakeToCamel } from "@helpers/snakeToCamel";
import { publicOrgEventsOverviewSchema,
  type PublicOrgEventsOverview
 } from "../schemas/public.orgEventsOverview.schema";
 
export function makePublicEventsOverviewRepo(supabase: SupabaseClient) {
  return {
    async getPublicOrgEventsOverview(
      orgSlug: string
    ): Promise<PublicOrgEventsOverview> {
      const raw = await supabaseSafe(() =>
        supabase.rpc("get_public_org_events_overview", { p_org_slug: orgSlug })
      );

      const camel = snakeToCamel(raw);
      return publicOrgEventsOverviewSchema.parse(camel);
    },
  };
}
