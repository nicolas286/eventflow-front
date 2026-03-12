import type { SupabaseClient } from "@supabase/supabase-js";

import { supabaseSafe } from "@gateways/supabase/supabaseSafe";
import { snakeToCamel } from "@helpers/snakeToCamel";

import {
  type SearchEventAdminTicketsViewRpcArgs,
  searchEventAdminTicketsViewRpcArgsSchema,
} from "../schemas/admin.searchEventTickertsViewInput.schema";

import {
  getEventTicketsAdminResponseSchema,
  type GetEventTicketsAdminResponse,
} from "../../singleEvent/schemas/admin.eventTickets.schema";

export type SearchEventTicketsAdminParams = {
  eventId: string;
  query: string;
  limit?: number;
  offset?: number;
};

export function makeEventTicketsAdminSearchRepo(supabase: SupabaseClient) {
  return {
    async searchEventTicketsAdmin(
      params: SearchEventTicketsAdminParams,
    ): Promise<GetEventTicketsAdminResponse> {
      const candidate: SearchEventAdminTicketsViewRpcArgs = {
        p_event_id: params.eventId,
        p_query: params.query,
        p_limit: params.limit ?? 50,
        p_offset: params.offset ?? 0,
      };

      const payload = searchEventAdminTicketsViewRpcArgsSchema.parse(candidate);

      const raw = await supabaseSafe<unknown | null>(() =>
        supabase.rpc("search_event_admin_tickets_view", payload),
      );

      if (!raw) {
        throw new Error("NOT_FOUND");
      }

      const camel = snakeToCamel(raw);
      return getEventTicketsAdminResponseSchema.parse(camel);
    },
  };
}