import type { SupabaseClient } from "@supabase/supabase-js";

import {
  startMollieConnectInputSchema,
  startMollieConnectResultSchema,
  type StartMollieConnectInput,
  type StartMollieConnectResult,
} from "../../../../domain/models/admin/admin.mollieConnect.schema";

/**
 * mollieConnectRepo
 * - Démarre le flow OAuth Mollie Connect
 * - Appelle l'Edge Function (ex: "mollie-connect-start")
 * - Retourne l'URL d'auth Mollie à ouvrir
 */
export function mollieConnectRepo(supabase: SupabaseClient) {
  return {
    async startMollieConnect(input: StartMollieConnectInput): Promise<StartMollieConnectResult> {
      const parsed = startMollieConnectInputSchema.parse(input);

      const res = await supabase.functions.invoke("mollie-connect-start", {
        body: parsed,
      });

      if (res.error) {
        throw new Error(
          typeof res.error === "object" && res.error && "message" in res.error
            ? String((res.error as any).message)
            : "Erreur Edge mollie-connect-start"
        );
      }

      if (!res.data) {
        throw new Error("Réponse vide de l’Edge Mollie");
      }

      if (res.data?.ok === false && res.data?.error) {
        throw new Error(
          `${res.data.error}${res.data.details ? `: ${res.data.details}` : ""}`
        );
      }

      return startMollieConnectResultSchema.parse(res.data);
    },
  };
}


