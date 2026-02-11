import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseSafe } from "../../supabaseSafe";
import { deleteEventInputSchema, 
  type DeleteEventInput } from "../../../../domain/models/admin/admin.deleteEventInput.schema";

export function deleteEventRepo(supabase: SupabaseClient) {
  return {
    async deleteEvent(input: DeleteEventInput): Promise<void> {
      const { eventId, orgId } = deleteEventInputSchema.parse(input);

      const rows = await supabaseSafe<{ id: string }[]>(
        () => {
          let q = supabase.from("events").delete().eq("id", eventId);
          if (orgId) q = q.eq("org_id", orgId);
          return q.select("id");
        },
      );

      if (rows.length === 0) {
        throw new Error("NOT_FOUND");
      }
    },
  };
}

