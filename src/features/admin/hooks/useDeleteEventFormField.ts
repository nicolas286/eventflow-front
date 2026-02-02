import { useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { deleteEventFormFieldRepo } from "../../../gateways/supabase/repositories/dashboard/deleteEventFormFieldRepo";
import { normalizeError } from "../../../domain/errors/errors";

type State = {
  loading: boolean;
  error: string | null;
};

export function useDeleteEventFormField(params: { supabase: SupabaseClient }) {
  const { supabase } = params;

  const repo = useMemo(() => deleteEventFormFieldRepo(supabase), [supabase]);

  const [state, setState] = useState<State>({
    loading: false,
    error: null,
  });

  async function deleteEventFormField(input: { id: string }): Promise<boolean> {
    try {
      setState({ loading: true, error: null });

      await repo.deleteEventFormField({ id: input.id });

      setState({ loading: false, error: null });
      return true;
    } catch (e: unknown) {
      const ne = normalizeError(e, "Impossible de supprimer le champ de formulaire.");
      setState({ loading: false, error: ne.message });
      return false;
    }
  }

  function reset() {
    setState({ loading: false, error: null });
  }

  return {
    ...state,
    deleteEventFormField,
    reset,
  };
}
