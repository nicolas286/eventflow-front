import { useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createRegisterRepo } from "../../../gateways/supabase/repositories/public/registerRepo";
import type { RegisterPayload, RegisterResponse } from "../../../domain/models/public/public.registerPayload.schema";
import { normalizeError } from "../../../domain/errors/errors";

type State = {
  loading: boolean;
  error: string | null;
  result: RegisterResponse | null;
};

export function useRegister(params: { supabase: SupabaseClient }) {
  const { supabase } = params;
  const registerRepo = useMemo(() => createRegisterRepo(supabase), [supabase]);

  const [state, setState] = useState<State>({
    loading: false,
    error: null,
    result: null,
  });

  async function register(input: RegisterPayload): Promise<RegisterResponse> {
    try {
      setState({ loading: true, error: null, result: null });

      const result = await registerRepo.register(input);

      // si l’edge renvoie { error: ... }
      if (result && typeof result === "object" && "error" in result) {
        const msg = typeof (result as any).error === "string" ? (result as any).error : "Erreur register";
        setState({ loading: false, error: msg, result });
        return result;
      }

      setState({ loading: false, error: null, result });
      return result;
    } catch (e: unknown) {

      const ne = normalizeError(e, "Impossible de finaliser la réservation");
      setState({ loading: false, error: ne.message, result: null });

      // au lieu de retourner null (qui casse tes if), on throw :
      throw ne;
    }
  }

  function reset() {
    setState({ loading: false, error: null, result: null });
  }

  return { ...state, register, reset };
}
