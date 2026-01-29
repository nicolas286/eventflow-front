import { useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { mollieConnectRepo } from "../../../gateways/supabase/repositories/dashboard/mollieConnectRepo";

import type {
  StartMollieConnectInput,
  StartMollieConnectResult,
} from "../../../domain/models/admin/admin.mollieConnect.schema";

import { normalizeError } from "../../../domain/errors/errors";

type State = {
  loading: boolean;
  error: string | null;
  last: StartMollieConnectResult | null;
};

export function useStartMollieConnect(params: { supabase: SupabaseClient }) {
  const { supabase } = params;

  const repo = useMemo(() => mollieConnectRepo(supabase), [supabase]);

  const [state, setState] = useState<State>({
    loading: false,
    error: null,
    last: null,
  });

  async function startMollieConnect(input: StartMollieConnectInput): Promise<string | null> {
    try {
      setState((s) => ({
        ...s,
        loading: true,
        error: null,
        last: null,
      }));

      const res = await repo.startMollieConnect(input);

      setState({
        loading: false,
        error: null,
        last: res,
      });

      // Le plus pratique pour la UI: renvoyer directement l'url
      return res.url;
    } catch (e: unknown) {
      const ne = normalizeError(e, "Impossible de lancer Mollie Connect");
      setState({
        loading: false,
        error: ne.message,
        last: null,
      });
      return null;
    }
  }

  function reset() {
    setState({
      loading: false,
      error: null,
      last: null,
    });
  }

  return {
    ...state,
    startMollieConnect,
    reset,
  };
}
