import type { SupabaseClient } from "@supabase/supabase-js";
import { type RegisterPayload,
  registerResponseSchema,
  type RegisterResponse
 } from "../schemas/public.registerPayload.schema";

export function createRegisterRepo(supabase: SupabaseClient) {
  return {
    async register(input: RegisterPayload): Promise<RegisterResponse> {
      const { data, error } = await supabase.functions.invoke("register", { body: input });

      if (error) throw error;
      if (!data) throw new Error("REGISTER_EMPTY_RESPONSE");

      return registerResponseSchema.parse(data);
    },
  };
}
