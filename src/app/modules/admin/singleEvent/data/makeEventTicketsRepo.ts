import type { SupabaseClient } from "@supabase/supabase-js";

import { supabaseSafe } from "@gateways/supabase/supabaseSafe";
import { snakeToCamel } from "@helpers/snakeToCamel";

import {
  getEventTicketsAdminResponseSchema,
  type GetEventTicketsAdminResponse,
} from "../schemas/admin.eventTickets.schema";

import {
  getEventTicketsAdminInputSchema,
  type GetEventTicketsAdminInput,
} from "../schemas/admin.eventTicketsInput.schema";

export type GetEventTicketsAdminParams = {
  eventId: string;
  limit?: number;
  offset?: number;
};

export function makeEventTicketsAdminRepo(supabase: SupabaseClient) {
  return {
    async getEventTicketsAdmin(
      params: GetEventTicketsAdminParams,
    ): Promise<GetEventTicketsAdminResponse> {
      const candidate: GetEventTicketsAdminInput = {
        p_event_id: params.eventId,
        p_limit: params.limit ?? 50,
        p_offset: params.offset ?? 0,
      };

      const payload = getEventTicketsAdminInputSchema.parse(candidate);

      const raw = await supabaseSafe<unknown | null>(() =>
        supabase.rpc("get_event_tickets_admin", payload),
      );

      if (!raw) {
        throw new Error("NOT_FOUND");
      }

      const camel = snakeToCamel(raw);
      return getEventTicketsAdminResponseSchema.parse(camel);
    },
  };
}