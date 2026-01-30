import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseSafe } from "../../supabaseSafe";

type DeleteEventProductInput = {
  id: string;
};

export function deleteEventProductRepo(supabase: SupabaseClient) {
  return {
    async deleteEventProduct(input: DeleteEventProductInput): Promise<void> {
      const { id } = input;

      if (!id) {
        throw new Error("deleteEventProduct: product ID is required");
      }

      const raw = await supabaseSafe(() =>
        supabase
          .from("event_products")
          .delete()
          .eq("id", id)
          .select("id")
      );

      const deletedCount = Array.isArray(raw) ? raw.length : 0;

      if (deletedCount === 0) {
        throw new Error(
          "deleteEventProduct: nothing deleted (not found or forbidden)"
        );
      }
    },
  };
}
