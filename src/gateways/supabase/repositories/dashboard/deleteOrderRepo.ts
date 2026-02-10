import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseSafe } from "../../supabaseSafe";

type DeleteOrderInput = {
  id: string;
};

export function deleteOrderRepo(supabase: SupabaseClient) {
  return {
    async deleteOrder(input: DeleteOrderInput): Promise<void> {
      const { id } = input;

      if (!id) {
        throw new Error("deleteOrder: order ID is required");
      }

      const raw = await supabaseSafe(() =>
        supabase
          .from("orders")
          .delete()
          .eq("id", id)
          .select("id")
      );

      const deletedCount = Array.isArray(raw) ? raw.length : 0;

      if (deletedCount === 0) {
        throw new Error(
          "deleteOrder: nothing deleted (not found or forbidden)"
        );
      }
    },
  };
}
