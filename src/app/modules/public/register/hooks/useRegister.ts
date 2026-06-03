import { useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createRegisterRepo } from "@app/modules/public/register/data/registerRepo";
import type { RegisterPayload, RegisterResponse } from "../schemas/public.registerPayload.schema";
import { normalizeError } from "@errors/errors";

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
        throw new Error(
          typeof (result as any).error === "string"
            ? (result as any).error
            : "Erreur register"
        );
      }

      setState({ loading: false, error: null, result });
      return result;

    } catch (e: unknown) {
      const ne = normalizeError(e, "Impossible de finaliser la réservation");

      setState({
        loading: false,
        error: ne.message,
        result: null,
      });

      throw ne;
    }
  }

  function reset() {
    setState({ loading: false, error: null, result: null });
  }

  return { ...state, register, reset };
}
