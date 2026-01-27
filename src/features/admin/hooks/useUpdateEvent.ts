import { useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { makeUpdateEventRepo } from "../../../gateways/supabase/repositories/dashboard/updateEventRepo";
import type { UpdateEventPatch } from "../../../domain/models/admin/admin.updateEventPatch.schema";
import type { Event } from "../../../domain/models/db/db.event.schema";
import { normalizeError } from "../../../domain/errors/errors";

export type UpdateEventInput = {
  eventId: string;
  patch: UpdateEventPatch;
};

type State = {
  loading: boolean;
  error: string | null;
  updated: Event | null;
};

export function useUpdateEvent(params: { supabase: SupabaseClient }) {
  const { supabase } = params;

  const repo = useMemo(() => makeUpdateEventRepo(supabase), [supabase]);

  const [state, setState] = useState<State>({
    loading: false,
    error: null,
    updated: null,
  });

  async function updateEvent(input: UpdateEventInput): Promise<Event | null> {
    try {
      setState({ loading: true, error: null, updated: null });

      const updated = await repo.updateEvent(input);

      setState({ loading: false, error: null, updated });
      return updated;
    } catch (e: unknown) {
      const ne = normalizeError(e, "Impossible d’enregistrer l’événement");
      setState({ loading: false, error: ne.message, updated: null });
      return null;
    }
  }

  function reset() {
    setState({ loading: false, error: null, updated: null });
  }

  return { ...state, updateEvent, reset };
}
