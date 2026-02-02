import { useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createStartSubscriptionRepo } from "../../../gateways/supabase/repositories/dashboard/startSubscriptionRepo";
import type {
  StartSubscriptionPayload,
  StartSubscriptionResponse,
} from "../../../domain/models/admin/admin.startSubscription.schema";
import { normalizeError } from "../../../domain/errors/errors";

/* ------------------------------------------------------------------ */
/* State                                                              */
/* ------------------------------------------------------------------ */

type State = {
  loading: boolean;
  error: string | null;
  result: StartSubscriptionResponse | null;
};

/* ------------------------------------------------------------------ */
/* Hook                                                               */
/* ------------------------------------------------------------------ */

export function useStartSubscription(params: { supabase: SupabaseClient }) {
  const { supabase } = params;

  const repo = useMemo(
    () => createStartSubscriptionRepo(supabase),
    [supabase]
  );

  const [state, setState] = useState<State>({
    loading: false,
    error: null,
    result: null,
  });

  async function startSubscription(
    input: StartSubscriptionPayload
  ): Promise<StartSubscriptionResponse | null> {
    try {
      setState({ loading: true, error: null, result: null });

      const result = await repo.startSubscription(input);

      setState({ loading: false, error: null, result });
      return result;
    } catch (e: unknown) {
      const ne = normalizeError(
        e,
        "Impossible de démarrer l’abonnement."
      );

      setState({ loading: false, error: ne.message, result: null });
      return null;
    }
  }

  function reset() {
    setState({ loading: false, error: null, result: null });
  }

  return {
    ...state,
    startSubscription,
    reset,
  };
}
