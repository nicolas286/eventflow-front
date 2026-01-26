import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseSafe } from "../../supabaseSafe";
import { snakeToCamel } from "../../../../domain/helpers/snakeToCamel";
import {
  publicOrgEventsOverviewSchema,
  type PublicOrgEventsOverview,
} from "../../../../domain/models/publicOrgEventsOverview.schema";

export function makePublicEventsRepo(supabase: SupabaseClient) {
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
