import type { SupabaseClient } from "@supabase/supabase-js";

import { supabaseSafe } from "@gateways/supabase/supabaseSafe";
import { snakeToCamel } from "@helpers/snakeToCamel";

import {
  eventAdminOrdersViewSchema,
  type EventAdminOrdersView,
} from "../schemas/admin.eventOrdersView.schema";

import {
  searchEventAdminOrdersViewRpcArgsSchema,
  type SearchEventAdminOrdersViewRpcArgs,
} from "../schemas/admin.searchEventOrdersViewInput.schema";

type Paging = {
  ordersLimit?: number;
  ordersOffset?: number;
};

type SearchArgs = {
  query: string;
  filterMode: "all" | "order" | `field:${string}`;
};

export type SearchEventAdminOrdersViewParams =
  | ({ orgId: string; eventSlug: string } & Paging & SearchArgs)
  | ({ eventId: string } & Paging & SearchArgs);

function isBySlug(
  p: SearchEventAdminOrdersViewParams,
): p is Extract<SearchEventAdminOrdersViewParams, { orgId: string; eventSlug: string }> {
  return "orgId" in p && "eventSlug" in p;
}

export function makeSearchEventAdminOrdersViewRepo(supabase: SupabaseClient) {
  return {
    async searchEventAdminOrdersView(
      params: SearchEventAdminOrdersViewParams,
    ): Promise<EventAdminOrdersView> {
      const base = {
        p_query: params.query,
        p_filter_mode: params.filterMode,
        p_orders_limit: params.ordersLimit ?? 50,
        p_orders_offset: params.ordersOffset ?? 0,
      };

      const candidate: SearchEventAdminOrdersViewRpcArgs = isBySlug(params)
        ? {
            ...base,
            p_org_id: params.orgId,
            p_event_slug: params.eventSlug,
          }
        : {
            ...base,
            p_event_id: params.eventId,
          };

      const payload = searchEventAdminOrdersViewRpcArgsSchema.parse(candidate);

      const raw = await supabaseSafe<unknown | null>(() =>
        supabase.rpc("search_event_admin_orders_view", payload),
      );

      if (!raw) {
        throw new Error("NOT_FOUND");
      }

      const camel = snakeToCamel(raw);
      return eventAdminOrdersViewSchema.parse(camel);
    },
  };
}