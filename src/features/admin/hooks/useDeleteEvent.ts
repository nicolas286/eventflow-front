import { useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { deleteEventRepo } from "../../../gateways/supabase/repositories/dashboard/deleteEventRepo";
import { normalizeError } from "../../../domain/errors/errors";

export type DeleteEventInput = {
  eventId: string;
  orgId?: string;
};

type State = {
  loading: boolean;
  error: string | null;
  deletedId: string | null;
};

export function useDeleteEvent(params: { supabase: SupabaseClient }) {
  const { supabase } = params;

  const repo = useMemo(() => deleteEventRepo(supabase), [supabase]);

  const [state, setState] = useState<State>({
    loading: false,
    error: null,
    deletedId: null,
  });

  async function deleteEvent(input: DeleteEventInput): Promise<boolean> {
    try {
      setState({ loading: true, error: null, deletedId: null });

      await repo.deleteEvent(input);

      setState({
        loading: false,
        error: null,
        deletedId: input.eventId,
      });

      return true;
    } catch (e: unknown) {
      const ne = normalizeError(e, "Impossible de supprimer l’événement");

      setState({
        loading: false,
        error: ne.message,
        deletedId: null,
      });

      return false;
    }
  }

  function reset() {
    setState({ loading: false, error: null, deletedId: null });
  }

  return { ...state, deleteEvent, reset };
}
