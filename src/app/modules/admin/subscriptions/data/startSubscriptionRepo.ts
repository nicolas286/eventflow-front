import type { SupabaseClient } from "@supabase/supabase-js";

import {
  startSubscriptionPayloadSchema,
  startSubscriptionResponseSchema,
  type StartSubscriptionPayload,
  type StartSubscriptionResponse,
} from "../schemas/admin.startSubscription.schema";

export function createStartSubscriptionRepo(supabase: SupabaseClient) {
  return {
    async startSubscription(input: StartSubscriptionPayload): Promise<StartSubscriptionResponse> {
      const payload = startSubscriptionPayloadSchema.parse(input);

      const { data, error } = await supabase.functions.invoke("start-subscription", {
        body: payload,
      });

      if (error) throw error;
      if (!data) throw new Error("START_SUBSCRIPTION_EMPTY_RESPONSE");

      return startSubscriptionResponseSchema.parse(data);
    },
  };
}
