import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseSafe } from "../../supabaseSafe";
import { snakeToCamel } from "../../../../domain/helpers/snakeToCamel";
import {
  dashboardBootstrapSchema,
  type DashboardBootstrap,
} from "../../../../domain/models/admin/admin.dashboardBootstrap.schema";

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
