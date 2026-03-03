import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseSafe } from "@gateways/supabase/supabaseSafe";
import { snakeToCamel } from "@helpers/snakeToCamel";
import { eventsOverviewSchema, type EventsOverview } from "../schemas/admin.eventsOverview.schema";

import { getEventsOverviewRpcArgsSchema } from "../schemas/admin.getEventsOverviewRpcArgs.schema";

export function makeEventsRepo(supabase: SupabaseClient) {
  return {
    async getEventsOverview(orgId: string): Promise<EventsOverview> {
      const payload = getEventsOverviewRpcArgsSchema.parse({ p_org_id: orgId });

      const raw = await supabaseSafe<unknown>(() =>
        supabase.rpc("get_events_overview", payload),
      );

      const camel = snakeToCamel(raw);
      return eventsOverviewSchema.parse(camel);
    },
  };
}
