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
        supabase.rpc("admin_delete_order", {
          p_order_id: id,
        })
      );

      /*
        La RPC renvoie un jsonb du type :
        {
          deleted_order_id: uuid,
          released: {
            reserved_units: number,
            sold_units: number
          }
        }

        → si on arrive ici sans throw, c’est que tout s’est bien passé
      */

      if (!raw || typeof raw !== "object") {
        throw new Error("deleteOrder: unexpected RPC response");
      }
    },
  };
}
