import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseSafe } from "../../supabaseSafe";
import { snakeToCamel } from "../../../../domain/helpers/snakeToCamel";
import { eventDetailAdminSchema,
    type EventDetailAdmin
 } from "../../../../domain/models/admin/admin.eventDetail.schema";

export function makeEventDetailAdminRepo(supabase: SupabaseClient) {
  return {
    async getEventDetailAdmin(params: {
      eventId: string;
      ordersLimit?: number;
      ordersOffset?: number;
      attendeesLimit?: number;
      attendeesOffset?: number;
    }): Promise<EventDetailAdmin> {
      const raw = await supabaseSafe(() =>
        supabase.rpc("get_event_detail_admin", {
          p_event_id: params.eventId,
          p_orders_limit: params.ordersLimit ?? 50,
          p_orders_offset: params.ordersOffset ?? 0,
          p_attendees_limit: params.attendeesLimit ?? 50,
          p_attendees_offset: params.attendeesOffset ?? 0,
        })
      );

      const camel = snakeToCamel(raw);
      return eventDetailAdminSchema.parse(camel);
    },
  };
}
