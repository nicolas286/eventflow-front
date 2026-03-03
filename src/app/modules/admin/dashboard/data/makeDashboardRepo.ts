import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseSafe } from "@gateways/supabase/supabaseSafe";
import { snakeToCamel } from "@helpers/snakeToCamel";
import { dashboardBootstrapSchema,
  type DashboardBootstrap
 } from "../schemas/admin.dashboardBootstrap.schema";

export function makeDashboardRepo(supabase: SupabaseClient) {
  return {
    async getDashboardBootstrap(): Promise<DashboardBootstrap | null> {
    const raw = await supabaseSafe<unknown | null>(() =>
      supabase.rpc("get_dashboard_bootstrap")
    );

    if (!raw) return null;

    const camel = snakeToCamel(raw);
    return dashboardBootstrapSchema.parse(camel);
  }
  };
}
