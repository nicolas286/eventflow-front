// gateways/supabase/repositories/dashboard/dashboardRepo.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseSafe } from "../../supabaseSafe";

export type DashboardBootstrap = {
  profile: any | null;
  membership: any | null;
  organization: any | null;
  organizationProfile: any | null;
  subscription: any | null;
  planLimits: any | null;
};

export function makeDashboardRepo(supabase: SupabaseClient) {
  return {
    async getDashboardBootstrap(): Promise<DashboardBootstrap> {
      return supabaseSafe<DashboardBootstrap>(() =>
        supabase.rpc("get_dashboard_bootstrap")
      );
    },
  };
}
