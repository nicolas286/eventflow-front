import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseSafe } from "../../supabaseSafe";

export function makeAdminEventsLookupRepo(supabase: SupabaseClient) {
  return {
    async getEventIdBySlug(params: { orgId: string; eventSlug: string }): Promise<string> {
      const raw = await supabaseSafe(() =>
        supabase
          .from("events")
          .select("id")
          .eq("org_id", params.orgId)
          .eq("slug", params.eventSlug)
          .single()
      );

      // raw = { id: "..." }
      if (!raw?.id) throw new Error("NOT_FOUND");
      return raw.id as string;
    },
  };
}
