import type { SupabaseClient } from "@supabase/supabase-js";
import {
  startMollieConnectInputSchema,
  startMollieConnectResultSchema,
  type StartMollieConnectInput,
  type StartMollieConnectResult,
} from "../../../../domain/models/admin/admin.mollieConnect.schema";

export function mollieConnectRepo(supabase: SupabaseClient) {
  return {
    async startMollieConnect(input: StartMollieConnectInput): Promise<StartMollieConnectResult> {
      const payload = startMollieConnectInputSchema.parse(input);

      const { data, error } = await supabase.functions.invoke("mollie-connect-start", {
        body: payload,
      });

      if (error) throw error;
      if (!data) throw new Error("MOLLIE_CONNECT_START_EMPTY_RESPONSE");

      if (data.ok === false) {
        throw new Error(String(data.error ?? "MOLLIE_CONNECT_START_FAILED"));
      }

      return startMollieConnectResultSchema.parse(data);
    },
  };
}
