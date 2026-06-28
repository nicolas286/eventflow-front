import type { SupabaseClient } from "@supabase/supabase-js";
import { edgeSafe } from "@shared/gateways/supabase/supabaseEdgeSafe";
import {
  startMollieConnectInputSchema,
  startMollieConnectResultSchema,
  type StartMollieConnectInput,
  type StartMollieConnectResult,
} from "../schemas/admin.mollieConnect.schema";

export function mollieConnectRepo(supabase: SupabaseClient) {
  return {
    async startMollieConnect(input: StartMollieConnectInput): Promise<StartMollieConnectResult> {
      const payload = startMollieConnectInputSchema.parse(input);

      const raw = await edgeSafe(
        () =>
          supabase.functions.invoke("mollie-connect-start", {
            body: payload,
          }),
        "MOLLIE_CONNECT_START_EMPTY_RESPONSE"
      );

      return startMollieConnectResultSchema.parse(raw);
    },
  };
}