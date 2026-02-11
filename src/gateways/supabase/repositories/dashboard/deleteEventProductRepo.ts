import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseSafe } from "../../supabaseSafe";
import { deleteEventProductInputSchema, 
  type DeleteEventProductInput } from "../../../../domain/models/admin/admin.deleteEventProductInput.schema";

export function deleteEventProductRepo(supabase: SupabaseClient) {
  return {
    async deleteEventProduct(input: DeleteEventProductInput): Promise<void> {
      const { id } = deleteEventProductInputSchema.parse(input);

      const rows = await supabaseSafe<{ id: string }[]>(
        () =>
          supabase
            .from("event_products")
            .delete()
            .eq("id", id)
            .select("id"),
      );

      if (rows.length === 0) {
        throw new Error("NOT_FOUND");
      }
    },
  };
}
