import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseSafe } from "../../supabaseSafe";
import { snakeToCamel } from "../../../../domain/helpers/snakeToCamel";
import {
  eventsOverviewSchema,
  type EventsOverview,
} from "../../../../domain/models/eventsOverview.schema";

export function makeEventsRepo(supabase: SupabaseClient) {
  return {
    async getEventsOverview(orgId: string): Promise<EventsOverview> {
      const raw = await supabaseSafe(() =>
        supabase.rpc("get_events_overview", { p_org_id: orgId })
      );

      const camel = snakeToCamel(raw);
      return eventsOverviewSchema.parse(camel);
    },
  };
}
