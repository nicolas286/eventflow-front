import type { SupabaseClient } from "@supabase/supabase-js";
import type { RegisterResponse, RegisterPayload } from "../../../../domain/models/public/public.registerPayload.schema";

export function createRegisterRepo(supabase: SupabaseClient) {
  return {
    async register(input: RegisterPayload): Promise<RegisterResponse> {
      // IMPORTANT: invoke retourne { data, error }
      const { data, error } = await supabase.functions.invoke("register", {
        body: input,
      });

      // si l'edge renvoie un status != 2xx, supabase met souvent error ici
      if (error) {
        // error.context?.body contient parfois la réponse JSON string
        const details =
          (error as any)?.context?.body ??
          (error as any)?.message ??
          String(error);

        throw new Error(details);
      }

      // si data est null => gros signal (pas normal si edge a répondu)
      if (!data) {
        throw new Error("REGISTER_EMPTY_RESPONSE");
      }

      return data as RegisterResponse;
    },
  };
}
