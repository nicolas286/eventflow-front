import { useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { adminAddOrderAttendeeRepo } from "../../../gateways/supabase/repositories/dashboard/addOrderAttendeeRepo";
import type {
  AdminAddOrderAttendeeInput,
  AdminAddOrderAttendeeResult,
} from "../../../domain/models/admin/admin.addOrderAttendee.schema";
import { normalizeError } from "../../../domain/errors/errors";

type State = {
  loading: boolean;
  error: string | null;
  result: AdminAddOrderAttendeeResult | null;
};

export function useAdminAddOrderAttendee(params: {
  supabase: SupabaseClient;
}) {
  const { supabase } = params;

  const repo = useMemo(
    () => adminAddOrderAttendeeRepo(supabase),
    [supabase]
  );

  const [state, setState] = useState<State>({
    loading: false,
    error: null,
    result: null,
  });

  async function addOrderAttendee(
    input: AdminAddOrderAttendeeInput
  ): Promise<AdminAddOrderAttendeeResult | null> {
    try {
      setState({ loading: true, error: null, result: null });

      const result = await repo.addAttendeeToOrder(input);

      setState({ loading: false, error: null, result });
      return result;
    } catch (e: unknown) {
      const ne = normalizeError(
        e,
        "Impossible d’ajouter le participant à la commande"
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
    addOrderAttendee,
    reset,
  };
}
