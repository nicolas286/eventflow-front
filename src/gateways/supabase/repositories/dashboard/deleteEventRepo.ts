import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseSafe } from "../../supabaseSafe";

type DeleteEventInput = {
  eventId: string;
  orgId?: string;
};

export function deleteEventRepo(supabase: SupabaseClient) {
  return {
    async deleteEvent(input: DeleteEventInput): Promise<void> {
      const { eventId, orgId } = input;

      if (!eventId) throw new Error("deleteEvent: eventId is required");

      const raw = await supabaseSafe(() => {
        let q = supabase.from("events").delete().eq("id", eventId);
        if (orgId) q = q.eq("org_id", orgId);
        return q.select("id");
      });

      const deletedCount = Array.isArray(raw) ? raw.length : 0;

      if (deletedCount === 0) {
        throw new Error("deleteEvent: nothing deleted (not found or forbidden)");
      }
    },
  };
}
