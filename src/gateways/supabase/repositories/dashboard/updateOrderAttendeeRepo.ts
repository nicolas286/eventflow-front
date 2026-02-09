import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseSafe } from "../../supabaseSafe";
import { snakeToCamel } from "../../../../domain/helpers/snakeToCamel";
import { camelToSnake } from "../../../../domain/helpers/camelToSnake";
import {
  adminUpdateOrderAttendeeInputSchema,
  adminUpdateOrderAttendeeResultSchema,
  type AdminUpdateOrderAttendeeInput,
  type AdminUpdateOrderAttendeeResult,
} from "../../../../domain/models/admin/admin.updateOrderAtendeeInput.schema";

export function adminUpdateOrderAttendeeRepo(supabase: SupabaseClient) {
  return {
    async updateOrderAttendee(input: AdminUpdateOrderAttendeeInput): Promise<AdminUpdateOrderAttendeeResult> {
      const validated = adminUpdateOrderAttendeeInputSchema.parse(input);
      const attendeeSnake = camelToSnake(validated.attendee);
      console.log("UPDATE attendee payload", attendeeSnake);


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
