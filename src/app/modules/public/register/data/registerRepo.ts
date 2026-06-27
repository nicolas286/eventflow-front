import type { SupabaseClient } from "@supabase/supabase-js";
import {
  registerPayloadSchema,
  registerResponseSchema,
  type RegisterResponse,
} from "../schemas/public.registerPayload.schema";

export function createRegisterRepo(supabase: SupabaseClient) {
  return {
    async register(input: unknown): Promise<RegisterResponse> {
      const parsed = registerPayloadSchema.safeParse(input);

      if (!parsed.success) {
        throw new Error("INVALID_REGISTER_PAYLOAD");
      }

      const payload = parsed.data;

      const { data, error } = await supabase.functions.invoke("register-tickets", {
        body: payload,
      });

      if (error) {
        let message = error.message || "REGISTER_FAILED";

        try {
          const body = await error.context?.json?.();

          if (body && typeof body === "object") {
            message = body.error ?? body.message ?? message;
          }
        } catch { /* empty */ }

        throw new Error(message);
      }

      if (!data) throw new Error("REGISTER_EMPTY_RESPONSE");

      return registerResponseSchema.parse(data);
    },
  };
}