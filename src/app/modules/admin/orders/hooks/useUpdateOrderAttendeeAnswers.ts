import { useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { adminUpdateOrderAttendeeRepo } from "../data/updateOrderAttendeeRepo";
import type {
  AdminUpdateOrderAttendeeInput,
  AdminUpdateOrderAttendeeResult,
} from "../schemas/admin.updateOrderAtendeeInput.schema";
import { normalizeError } from "@errors/errors";

type State = {
  loading: boolean;
  error: string | null;
  result: AdminUpdateOrderAttendeeResult | null;
};

export function useAdminUpdateOrderAttendee(params: { supabase: SupabaseClient }) {
  const { supabase } = params;

  const repo = useMemo(() => adminUpdateOrderAttendeeRepo(supabase), [supabase]);

  const [state, setState] = useState<State>({
    loading: false,
    error: null,
    result: null,
  });

  async function updateOrderAttendee(
    input: AdminUpdateOrderAttendeeInput
  ): Promise<AdminUpdateOrderAttendeeResult | null> {
    try {
      setState({ loading: true, error: null, result: null });

      const result = await repo.updateOrderAttendee(input);

      setState({ loading: false, error: null, result });
      return result;
    } catch (e: unknown) {
      const ne = normalizeError(e, "Impossible de modifier le participant");
      setState({ loading: false, error: ne.message, result: null });
      return null;
    }
  }

  function reset() {
    setState({ loading: false, error: null, result: null });
  }

  return {
    ...state,
    updateOrderAttendee,
    reset,
  };
}
