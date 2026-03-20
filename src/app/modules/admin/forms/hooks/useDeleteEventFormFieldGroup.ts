import { useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { deleteEventFormFieldGroupRepo } from "../data/deleteEventFormFieldGroupRepo";
import { normalizeError } from "@errors/errors";

type State = {
  loading: boolean;
  error: string | null;
};

export function useDeleteEventFormFieldGroup(params: { supabase: SupabaseClient }) {
  const { supabase } = params;

  const repo = useMemo(() => deleteEventFormFieldGroupRepo(supabase), [supabase]);

  const [state, setState] = useState<State>({
    loading: false,
    error: null,
  });

  async function deleteEventFormFieldGroup(input: { id: string }): Promise<boolean> {
    try {
      setState({ loading: true, error: null });

      await repo.deleteEventFormFieldGroup({ id: input.id });

      setState({ loading: false, error: null });
      return true;
    } catch (e: unknown) {
      const ne = normalizeError(e, "Impossible de supprimer le groupe de champs.");
      setState({ loading: false, error: ne.message });
      return false;
    }
  }

  function reset() {
    setState({ loading: false, error: null });
  }

  return {
    ...state,
    deleteEventFormFieldGroup,
    reset,
  };
}