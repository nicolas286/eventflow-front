import type { SupabaseClient } from "@supabase/supabase-js";

import { supabaseSafe } from "@gateways/supabase/supabaseSafe";
import { snakeToCamel } from "@helpers/snakeToCamel";

import {
  eventParticipantsExportSchema,
  type EventParticipantsExportData,
} from "../schemas/admin.getEventParticipantsExport.schema";

import {
  getEventParticipantsExportArgsSchema,
  type GetEventParticipantsExportArgs,
} from "../schemas/admin.getEventParticipantsExportInput.schema";

export type GetEventParticipantsExportParams =
  | {
      orgId: string;
      eventSlug: string;
      confirmedOnly?: boolean;
    }
  | {
      eventId: string;
      confirmedOnly?: boolean;
    };

function isBySlug(
  p: GetEventParticipantsExportParams,
): p is Extract<GetEventParticipantsExportParams, { orgId: string; eventSlug: string }> {
  return "orgId" in p && "eventSlug" in p;
}

export function makeEventParticipantsExportRepo(supabase: SupabaseClient) {
  return {
    async getEventParticipantsExportData(
      params: GetEventParticipantsExportParams,
    ): Promise<EventParticipantsExportData> {
      const candidate: GetEventParticipantsExportArgs = isBySlug(params)
        ? {
            p_org_id: params.orgId,
            p_event_slug: params.eventSlug,
            p_confirmed_only: params.confirmedOnly ?? true,
          }
        : {
            p_event_id: params.eventId,
            p_confirmed_only: params.confirmedOnly ?? true,
          };

      const payload = getEventParticipantsExportArgsSchema.parse(candidate);

      const raw = await supabaseSafe<unknown | null>(() =>
        supabase.rpc("get_event_admin_participants_export_data", payload),
      );

      if (!raw) {
        throw new Error("NOT_FOUND");
      }

      const camel = snakeToCamel(raw);
      return eventParticipantsExportSchema.parse(camel);
    },
  };
}