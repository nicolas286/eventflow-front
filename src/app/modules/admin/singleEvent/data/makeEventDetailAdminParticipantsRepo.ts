import type { SupabaseClient } from "@supabase/supabase-js";

import { supabaseSafe } from "@gateways/supabase/supabaseSafe";
import { snakeToCamel } from "@helpers/snakeToCamel";

import { eventDetailAdminParticipantsSchema,
    type EventDetailAdminParticipants,
 } from "../schemas/admin.eventDetail.schema";

import {
  getEventDetailAdminParticipantsRpcArgsSchema,
  type GetEventDetailAdminParticipantsRpcArgs,
} from "../schemas/admin.getEventDetailParticipantsInput.schema";

type Paging = {
  attendeesLimit?: number;
  attendeesOffset?: number;
};

export type GetEventDetailAdminParticipantsParams =
  | ({ orgId: string; eventSlug: string } & Paging)
  | ({ eventId: string } & Paging);

function isBySlug(
  p: GetEventDetailAdminParticipantsParams,
): p is Extract<
  GetEventDetailAdminParticipantsParams,
  { orgId: string; eventSlug: string }
> {
  return "orgId" in p && "eventSlug" in p;
}

export function makeEventDetailAdminParticipantsRepo(supabase: SupabaseClient) {
  return {
    async getEventDetailAdminParticipants(
      params: GetEventDetailAdminParticipantsParams,
    ): Promise<EventDetailAdminParticipants> {
      const base = {
        p_attendees_limit: params.attendeesLimit ?? 50,
        p_attendees_offset: params.attendeesOffset ?? 0,
      };

      const candidate: GetEventDetailAdminParticipantsRpcArgs = isBySlug(params)
        ? {
            ...base,
            p_org_id: params.orgId,
            p_event_slug: params.eventSlug,
          }
        : {
            ...base,
            p_event_id: params.eventId,
          };

      const payload = getEventDetailAdminParticipantsRpcArgsSchema.parse(candidate);

      const raw = await supabaseSafe<unknown | null>(() =>
        supabase.rpc("get_event_detail_admin_participants", payload),
      );

      if (!raw) {
        throw new Error("NOT_FOUND");
      }

      const camel = snakeToCamel(raw);
      return eventDetailAdminParticipantsSchema.parse(camel);
    },
  };
}