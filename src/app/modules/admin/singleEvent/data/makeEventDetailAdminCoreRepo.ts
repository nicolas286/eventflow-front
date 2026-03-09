import type { SupabaseClient } from "@supabase/supabase-js";

import { supabaseSafe } from "@gateways/supabase/supabaseSafe";
import { snakeToCamel } from "@helpers/snakeToCamel";

import {
  eventDetailAdminCoreSchema,
  type EventDetailAdminCore,
} from "../schemas/admin.eventDetail.schema";

import {
  getEventDetailAdminCoreRpcArgsSchema,
  type GetEventDetailAdminCoreRpcArgs,
} from "../schemas/admin.getEventDetailCoreInput.schema";

export type GetEventDetailAdminCoreParams =
  | { orgId: string; eventSlug: string }
  | { eventId: string };

function isBySlug(
  p: GetEventDetailAdminCoreParams,
): p is Extract<GetEventDetailAdminCoreParams, { orgId: string; eventSlug: string }> {
  return "orgId" in p && "eventSlug" in p;
}

export function makeEventDetailAdminCoreRepo(supabase: SupabaseClient) {
  return {
    async getEventDetailAdminCore(
      params: GetEventDetailAdminCoreParams,
    ): Promise<EventDetailAdminCore> {
      const candidate: GetEventDetailAdminCoreRpcArgs = isBySlug(params)
        ? {
            p_org_id: params.orgId,
            p_event_slug: params.eventSlug,
          }
        : {
            p_event_id: params.eventId,
          };

      const payload = getEventDetailAdminCoreRpcArgsSchema.parse(candidate);

      const raw = await supabaseSafe<unknown | null>(() =>
        supabase.rpc("get_event_detail_admin_core", payload),
      );

      if (!raw) {
        throw new Error("NOT_FOUND");
      }

      const camel = snakeToCamel(raw);
      return eventDetailAdminCoreSchema.parse(camel);
    },
  };
}