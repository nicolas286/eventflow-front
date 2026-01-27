import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseSafe } from "../../supabaseSafe";
import { snakeToCamel } from "../../../../domain/helpers/snakeToCamel";
import {
  dashboardBootstrapSchema,
  type DashboardBootstrap,
} from "../../../../domain/models/admin/admin.dashboardBootstrap.schema";

export function makeDashboardRepo(supabase: SupabaseClient) {
  return {
    async getDashboardBootstrap(): Promise<DashboardBootstrap> {
      const raw = await supabaseSafe(() =>
        supabase.rpc("get_dashboard_bootstrap")
      );

      const camel = snakeToCamel(raw);
      return dashboardBootstrapSchema.parse(camel);
    },
  };
}
