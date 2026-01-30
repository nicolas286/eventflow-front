import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseSafe } from "../../supabaseSafe";
import { snakeToCamel } from "../../../../domain/helpers/snakeToCamel";
import {
  eventDetailAdminSchema,
  type EventDetailAdmin,
} from "../../../../domain/models/admin/admin.eventDetail.schema";

type GetEventDetailAdminParams =
  | {
      // ✅ nouveau flow : orgId + slug (plus de PostgREST lookup)
      orgId: string;
      eventSlug: string;

      ordersLimit?: number;
      ordersOffset?: number;
      attendeesLimit?: number;
      attendeesOffset?: number;
    }
  | {
      // ✅ compat : ancien flow (si tu l'utilises encore ailleurs)
      eventId: string;

      ordersLimit?: number;
      ordersOffset?: number;
      attendeesLimit?: number;
      attendeesOffset?: number;
    };

function isBySlug(
  p: GetEventDetailAdminParams
): p is Extract<GetEventDetailAdminParams, { orgId: string; eventSlug: string }> {
  return "orgId" in p && "eventSlug" in p;
}

export function makeEventDetailAdminRepo(supabase: SupabaseClient) {
  return {
    async getEventDetailAdmin(params: GetEventDetailAdminParams): Promise<EventDetailAdmin> {
      const payload: Record<string, any> = {
        p_orders_limit: params.ordersLimit ?? 50,
        p_orders_offset: params.ordersOffset ?? 0,
        p_attendees_limit: params.attendeesLimit ?? 50,
        p_attendees_offset: params.attendeesOffset ?? 0,
      };

      if (isBySlug(params)) {
        payload.p_org_id = params.orgId;
        payload.p_event_slug = params.eventSlug;
        // p_event_id volontairement omis (default null côté SQL)
      } else {
        payload.p_event_id = params.eventId;
      }

      const raw = await supabaseSafe(() => supabase.rpc("get_event_detail_admin", payload));

      const camel = snakeToCamel(raw);
      return eventDetailAdminSchema.parse(camel);
    },
  };
}
