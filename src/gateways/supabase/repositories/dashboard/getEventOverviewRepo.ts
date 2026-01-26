// gateways/supabase/repositories/events/eventsRepo.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseSafe } from "../../supabaseSafe";

export type EventsOverview = {
  orgId: string;
  events: Array<{
    event: any; // events (subset)
    ordersCount: number;
    paidCents: number;
  }>;
};

export function makeEventsRepo(supabase: SupabaseClient) {
  return {
    async getEventsOverview(orgId: string): Promise<EventsOverview> {
      return supabaseSafe<EventsOverview>(() =>
        supabase.rpc("get_events_overview", { p_org_id: orgId })
      );
    },
  };
}
