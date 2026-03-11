import type { SupabaseClient } from "@supabase/supabase-js";

import { supabaseSafe } from "@gateways/supabase/supabaseSafe";
import { snakeToCamel } from "@helpers/snakeToCamel";

import {
  markTicketCheckedInByQrInputSchema,
  markTicketCheckedInByQrResponseSchema,
  type MarkTicketCheckedInByQrInput,
  type MarkTicketCheckedInByQrResponse,
} from "../schemas/admin.markTicketCheckedIn.schema";

export type MarkTicketCheckedInByQrParams = {
  qrToken: string;
  eventId: string;
};

export function markTicketCheckedInByQrRepo(supabase: SupabaseClient) {
  return {
    async markTicketCheckedInByQr(
      params: MarkTicketCheckedInByQrParams,
    ): Promise<MarkTicketCheckedInByQrResponse> {
      const candidate: MarkTicketCheckedInByQrInput = {
        p_qr_token: params.qrToken,
        p_event_id: params.eventId,
      };

      const payload = markTicketCheckedInByQrInputSchema.parse(candidate);

      const raw = await supabaseSafe<unknown | null>(() =>
        supabase.rpc("mark_ticket_checked_in_by_qr", payload),
      );

      if (!raw) {
        throw new Error("NOT_FOUND");
      }

      const camel = snakeToCamel(raw);
      return markTicketCheckedInByQrResponseSchema.parse(camel);
    },
  };
}