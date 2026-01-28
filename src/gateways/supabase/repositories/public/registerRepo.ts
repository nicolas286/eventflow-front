import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseSafe } from "../../supabaseSafe";
import { registerPayloadSchema, 
    registerResponseSchema,
    type RegisterPayload,
    type RegisterResponse,
} from "../../../../domain/models/public/public.registerPayload.schema";

/**
 * Repo: Registration (PUBLIC)
 * - appelle l’edge function `register`
 * - Turnstile token inclus dans payload
 */
export function createRegisterRepo(supabase: SupabaseClient) {
  return {
    async register(input: RegisterPayload): Promise<RegisterResponse> {
      // 1) Validate front payload (Zod) BEFORE sending anything
      const validated = registerPayloadSchema.parse(input);

      // 2) Call edge function
      const raw = await supabaseSafe(async () => {
        const { data, error } = await supabase.functions.invoke("register", {
          body: validated,
        });

        if (error) throw error;
        return data;
      });

      // 3) Parse response (success OR error)
      return registerResponseSchema.parse(raw);
    },
  };
}
