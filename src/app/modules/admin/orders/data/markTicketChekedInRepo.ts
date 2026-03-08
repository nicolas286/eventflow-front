import type { SupabaseClient } from "@supabase/supabase-js";

import { supabaseSafe } from "@gateways/supabase/supabaseSafe";
import { snakeToCamel } from "@helpers/snakeToCamel";

import {
  markTicketCheckedInInputSchema,
  markTicketCheckedInResponseSchema,
  type MarkTicketCheckedInInput,
  type MarkTicketCheckedInResponse,
} from "../schemas/admin.markTicketCheckedIn.schema";

export type MarkTicketCheckedInParams = {
  ticketId: string;
};

export function markTicketCheckedInRepo(supabase: SupabaseClient) {
  return {
    async markTicketCheckedIn(
      params: MarkTicketCheckedInParams,
    ): Promise<MarkTicketCheckedInResponse> {
      const candidate: MarkTicketCheckedInInput = {
        p_ticket_id: params.ticketId,
      };

      const payload = markTicketCheckedInInputSchema.parse(candidate);

      const raw = await supabaseSafe<unknown | null>(() =>
        supabase.rpc("mark_ticket_checked_in", payload),
      );

      if (!raw) {
        throw new Error("NOT_FOUND");
      }

      const camel = snakeToCamel(raw);
      return markTicketCheckedInResponseSchema.parse(camel);
    },
  };
}