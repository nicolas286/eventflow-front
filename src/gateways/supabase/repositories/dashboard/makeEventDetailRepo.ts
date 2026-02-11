import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseSafe } from "../../supabaseSafe";
import { snakeToCamel } from "../../../../domain/helpers/snakeToCamel";
import {
  eventDetailAdminSchema,
  type EventDetailAdmin,
} from "../../../../domain/models/admin/admin.eventDetail.schema";

import { getEventDetailAdminRpcArgsSchema, 
  type GetEventDetailAdminRpcArgs
 } from "../../../../domain/models/admin/admin.getEventDetailInput.schema";

type Paging = {
  ordersLimit?: number;
  ordersOffset?: number;
  attendeesLimit?: number;
  attendeesOffset?: number;
};

export type GetEventDetailAdminParams =
  | ({ orgId: string; eventSlug: string } & Paging)
  | ({ eventId: string } & Paging);

function isBySlug(
  p: GetEventDetailAdminParams,
): p is Extract<GetEventDetailAdminParams, { orgId: string; eventSlug: string }> {
  return "orgId" in p && "eventSlug" in p;
}

export function makeEventDetailAdminRepo(supabase: SupabaseClient) {
  return {
    async getEventDetailAdmin(params: GetEventDetailAdminParams): Promise<EventDetailAdmin> {
      const base = {
        p_orders_limit: params.ordersLimit ?? 50,
        p_orders_offset: params.ordersOffset ?? 0,
        p_attendees_limit: params.attendeesLimit ?? 50,
        p_attendees_offset: params.attendeesOffset ?? 0,
      };

      const candidate: GetEventDetailAdminRpcArgs = isBySlug(params)
        ? {
            ...base,
            p_org_id: params.orgId,
            p_event_slug: params.eventSlug,
          }
        : {
            ...base,
            p_event_id: params.eventId,
          };

      const payload = getEventDetailAdminRpcArgsSchema.parse(candidate);

      const raw = await supabaseSafe<unknown | null>(() =>
        supabase.rpc("get_event_detail_admin", payload),
      );

      if (!raw) {
        throw new Error("NOT_FOUND");
      }

      const camel = snakeToCamel(raw);
      return eventDetailAdminSchema.parse(camel);
    },
  };
}
