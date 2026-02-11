import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseSafe } from "../../supabaseSafe";
import { deleteOrderInputSchema, 
  type DeleteOrderInput } from "../../../../domain/models/admin/admin.deleteOrderInput.schema";
import type { AdminDeleteOrderResult } from "../../../../domain/models/admin/admin.deleteOrderResult.schema";


export function deleteOrderRepo(supabase: SupabaseClient) {
  return {
    async deleteOrder(input: DeleteOrderInput): Promise<void> {
      const { id } = deleteOrderInputSchema.parse(input);

       const raw = await supabaseSafe<AdminDeleteOrderResult>(() =>
        supabase.rpc("admin_delete_order", { p_order_id: id }),
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
