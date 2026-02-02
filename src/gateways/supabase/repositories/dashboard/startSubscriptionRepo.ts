import type { SupabaseClient } from "@supabase/supabase-js";

import {
  startSubscriptionPayloadSchema,
  startSubscriptionResponseSchema,
  type StartSubscriptionPayload,
  type StartSubscriptionResponse,
} from "../../../../domain/models/admin/admin.startSubscription.schema";

/**
 * start-subscription (AUTH)
 * - Appelle l'edge function start-subscription
 * - Renvoie soit:
 *   - { action: "checkout", checkoutUrl } (1ère fois, mandate)
 *   - { action: "sub_created" } (mandate ok ou déjà abonné)
 */
export function createStartSubscriptionRepo(supabase: SupabaseClient) {
  return {
    async startSubscription(input: StartSubscriptionPayload): Promise<StartSubscriptionResponse> {
      const payload = startSubscriptionPayloadSchema.parse(input);

      const { data, error } = await supabase.functions.invoke("start-subscription", {
        body: payload,
      });

      if (error) {
        // Supabase Functions: error.context?.body est souvent un JSON string
        const raw =
          (error as any)?.context?.body ??
          (error as any)?.message ??
          String(error);

        // Si c'est un JSON, on tente d'extraire un message plus clean
        try {
          const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
          const msg =
            parsed?.error ??
            parsed?.message ??
            parsed?.details ??
            raw;

          throw new Error(String(msg));
        } catch {
          throw new Error(String(raw));
        }
      }

      if (!data) {
        throw new Error("START_SUBSCRIPTION_EMPTY_RESPONSE");
      }

      return startSubscriptionResponseSchema.parse(data);
    },
  };
}
