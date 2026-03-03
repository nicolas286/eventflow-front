import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseSafe } from "@shared/gateways/supabase/supabaseSafe";
import { snakeToCamel } from "@helpers/snakeToCamel";
import { camelToSnake } from "@helpers/camelToSnake";
import {
  adminUpdateOrderAttendeeInputSchema,
  adminUpdateOrderAttendeeResultSchema,
  type AdminUpdateOrderAttendeeInput,
  type AdminUpdateOrderAttendeeResult,
} from "@app/modules/admin/orders/schemas/admin.updateOrderAtendeeInput.schema";

export function adminUpdateOrderAttendeeRepo(supabase: SupabaseClient) {
  return {
    async updateOrderAttendee(input: AdminUpdateOrderAttendeeInput): Promise<AdminUpdateOrderAttendeeResult> {
      const validated = adminUpdateOrderAttendeeInputSchema.parse(input);
      const attendeeSnake = camelToSnake(validated.attendee);


      const raw = await supabaseSafe(() =>
        supabase.rpc("admin_update_order_attendee", {
          p_attendee_id: validated.attendeeId,
          p_attendee: attendeeSnake,
        })
      );

      const camel = snakeToCamel(raw);
      return adminUpdateOrderAttendeeResultSchema.parse(camel);
    },
  };
}
