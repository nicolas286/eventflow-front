import type { SupabaseClient } from "@supabase/supabase-js";

import { supabaseSafe } from "@gateways/supabase/supabaseSafe";
import { snakeToCamel } from "@helpers/snakeToCamel";

import {
  eventAdminOrdersViewSchema,
  type EventAdminOrdersView,
} from "../schemas/admin.eventOrdersView.schema";

import {
  getEventAdminOrdersViewRpcArgsSchema,
  type GetEventAdminOrdersViewRpcArgs,
} from "../schemas/admin.getEventOrdersViewInput.schema";

type Paging = {
  ordersLimit?: number;
  ordersOffset?: number;
};

export type GetEventAdminOrdersViewParams =
  | ({ orgId: string; eventSlug: string } & Paging)
  | ({ eventId: string } & Paging);

function isBySlug(
  p: GetEventAdminOrdersViewParams,
): p is Extract<GetEventAdminOrdersViewParams, { orgId: string; eventSlug: string }> {
  return "orgId" in p && "eventSlug" in p;
}

export function makeEventAdminOrdersViewRepo(supabase: SupabaseClient) {
  return {
    async getEventAdminOrdersView(
      params: GetEventAdminOrdersViewParams,
    ): Promise<EventAdminOrdersView> {
      const base = {
        p_orders_limit: params.ordersLimit ?? 50,
        p_orders_offset: params.ordersOffset ?? 0,
      };

      const candidate: GetEventAdminOrdersViewRpcArgs = isBySlug(params)
        ? {
            ...base,
            p_org_id: params.orgId,
            p_event_slug: params.eventSlug,
          }
        : {
            ...base,
            p_event_id: params.eventId,
          };

      const payload = getEventAdminOrdersViewRpcArgsSchema.parse(candidate);

      const raw = await supabaseSafe<unknown | null>(() =>
        supabase.rpc("get_event_admin_orders_view", payload),
      );

      if (!raw) {
        throw new Error("NOT_FOUND");
      }

      const camel = snakeToCamel(raw);
      return eventAdminOrdersViewSchema.parse(camel);
    },
  };
}