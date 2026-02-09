import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseSafe } from "../../supabaseSafe";
import { snakeToCamel } from "../../../../domain/helpers/snakeToCamel";
import {
  adminAddOrderAttendeeInputSchema,
  type AdminAddOrderAttendeeInput,
  adminAddOrderAttendeeResultSchema,
  type AdminAddOrderAttendeeResult,
} from "../../../../domain/models/admin/admin.addOrderAttendee.schema";
import { camelToSnake } from "../../../../domain/helpers/camelToSnake";

export function adminAddOrderAttendeeRepo(supabase: SupabaseClient) {
  return {
    async addAttendeeToOrder(
      input: AdminAddOrderAttendeeInput
    ): Promise<AdminAddOrderAttendeeResult> {

      const validated = adminAddOrderAttendeeInputSchema.parse(input);

      const attendeeSnake = camelToSnake(validated.attendee);

      const raw = await supabaseSafe(() =>
        supabase.rpc("admin_add_order_attendee", {
          p_order_id: validated.orderId,
          p_event_product_id: validated.eventProductId,
          p_attendee: attendeeSnake, // 👈 snake_case
          p_mark_paid: validated.markPaid ?? false,
        })
      );

      const camel = snakeToCamel(raw);
      return adminAddOrderAttendeeResultSchema.parse(camel);
    },
  };
}
