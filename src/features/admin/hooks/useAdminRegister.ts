import { useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminRegisterRepo } from "../../../gateways/supabase/repositories/dashboard/adminRegisterRepo";
import type {
  AdminRegisterPayload,
  AdminRegisterResponse,
} from "../../../domain/models/admin/admin.registerPayload.schema";
import { normalizeError } from "../../../domain/errors/errors";

type State = {
  loading: boolean;
  error: string | null;
  result: AdminRegisterResponse | null;
};

export function useAdminRegister(params: { supabase: SupabaseClient }) {
  const { supabase } = params;
  const adminRegisterRepo = useMemo(() => createAdminRegisterRepo(supabase), [supabase]);

  const [state, setState] = useState<State>({
    loading: false,
    error: null,
    result: null,
  });

  async function register(input: AdminRegisterPayload): Promise<AdminRegisterResponse> {
    try {
      setState({ loading: true, error: null, result: null });

      console.log("[admin-register] sending", input);

      const result = await adminRegisterRepo.register(input);

      console.log("[admin-register] received", result);

      // si l’edge renvoie { error: ... }
      if (result && typeof result === "object" && "error" in result) {
        const msg =
          typeof (result as any).error === "string"
            ? (result as any).error
            : "Erreur admin-register";
        setState({ loading: false, error: msg, result });
        return result;
      }

      setState({ loading: false, error: null, result });
      return result;
    } catch (e: unknown) {
      console.error("[admin-register] failed", e);

      const ne = normalizeError(e, "Impossible de créer la commande");
      setState({ loading: false, error: ne.message, result: null });

      throw e;
    }
  }

  function reset() {
    setState({ loading: false, error: null, result: null });
  }

  return { ...state, register, reset };
}
