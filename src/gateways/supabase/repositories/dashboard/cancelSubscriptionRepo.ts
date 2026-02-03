import type { SupabaseClient } from "@supabase/supabase-js";

import {
  cancelSubscriptionPayloadSchema,
  cancelSubscriptionResponseSchema,
  type CancelSubscriptionPayload,
  type CancelSubscriptionResponse,
} from "../../../../domain/models/admin/admin.cancelSubscription.schema";

/**
 * cancel-subscription (AUTH)
 * - Appelle l'edge function cancel-subscription
 * - Résilie l'abonnement Mollie + repasse l'orga en Free + supprime la row subscriptions
 */
export function createCancelSubscriptionRepo(supabase: SupabaseClient) {
  return {
    async cancelSubscription(
      input: CancelSubscriptionPayload,
    ): Promise<CancelSubscriptionResponse> {
      const payload = cancelSubscriptionPayloadSchema.parse(input);

      const { data, error } = await supabase.functions.invoke("cancel-suscription", {
        body: payload,
      });

      if (error) {
        const raw =
          (error as any)?.context?.body ??
          (error as any)?.message ??
          String(error);

        try {
          const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
          const msg = parsed?.error ?? parsed?.message ?? parsed?.details ?? raw;
          throw new Error(String(msg));
        } catch {
          throw new Error(String(raw));
        }
      }

      if (!data) {
        throw new Error("CANCEL_SUBSCRIPTION_EMPTY_RESPONSE");
      }

      return cancelSubscriptionResponseSchema.parse(data);
    },
  };
}
