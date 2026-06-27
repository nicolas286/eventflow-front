import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buyerEmailSchema,
  registerPayloadSchema,
  registerResponseSchema,
  type RegisterResponse,
} from "../schemas/public.registerPayload.schema";

export function createRegisterRepo(supabase: SupabaseClient) {
  return {
    async register(input: unknown): Promise<RegisterResponse> {
  console.log("REGISTER REPO HIT");
  console.log("INPUT BUYER EMAIL", (input as any)?.buyerEmail);
  console.log("DIRECT EMAIL TEST", buyerEmailSchema.safeParse((input as any)?.buyerEmail));

  const parsed = registerPayloadSchema.safeParse(input);

  console.log("PAYLOAD PARSED", parsed.success);
  if (!parsed.success) {
    console.log(parsed.error.flatten());
    throw new Error("INVALID_REGISTER_PAYLOAD");
  }

  const payload = parsed.data;

  console.log("INVOKE EDGE NOW", payload);

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