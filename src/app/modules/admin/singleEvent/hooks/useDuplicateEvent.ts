import { useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createEventsRepo } from "@app/modules/admin/singleEvent/data/createEventRepo";
import type { DuplicateEventInput } from "../schemas/admin.duplicateEvent.schema";
import type { Event } from "@shared/models/db/db.event.schema";
import { normalizeError } from "@errors/errors";

type State = {
  loading: boolean;
  error: string | null;
  duplicated: Event | null;
};

export function useDuplicateEvent(params: { supabase: SupabaseClient }) {
  const { supabase } = params;

  const eventsRepo = useMemo(() => createEventsRepo(supabase), [supabase]);

  const [state, setState] = useState<State>({
    loading: false,
    error: null,
    duplicated: null,
  });

  async function duplicateEvent(input: DuplicateEventInput): Promise<Event | null> {
    try {
      setState({ loading: true, error: null, duplicated: null });

      const duplicated = await eventsRepo.duplicateEvent(input);

      setState({ loading: false, error: null, duplicated });
      return duplicated;
    } catch (e: unknown) {
      const ne = normalizeError(e, "Impossible de dupliquer l’événement");
      setState({ loading: false, error: ne.message, duplicated: null });
      return null;
    }
  }

  function reset() {
    setState({ loading: false, error: null, duplicated: null });
  }

  return {
    ...state,
    duplicateEvent,
    reset,
  };
}