import { useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createEventsRepo } from "../../../gateways/supabase/repositories/dashboard/createEventRepo";
import type { CreateEventInput } from "../../../domain/models/admin/admin.createEvent.schema";
import type { Event } from "../../../domain/models/db/db.event.schema";
import { normalizeError } from "../../../domain/errors/errors";

type State = {
  loading: boolean;
  error: string | null;
  created: Event | null;
};

export function useCreateEvent(params: { supabase: SupabaseClient }) {
  const { supabase } = params;

  const eventsRepo = useMemo(() => createEventsRepo(supabase), [supabase]);

  const [state, setState] = useState<State>({
    loading: false,
    error: null,
    created: null,
  });

  async function createEvent(input: CreateEventInput): Promise<Event | null> {
    try {
      setState({ loading: true, error: null, created: null });

      const created = await eventsRepo.createEvent(input);

      setState({ loading: false, error: null, created });
      return created;
    } catch (e: unknown) {
      const ne = normalizeError(e, "Impossible de créer l’événement");
      setState({ loading: false, error: ne.message, created: null });
      return null;
    }
  }

  function reset() {
    setState({ loading: false, error: null, created: null });
  }

  return {
    ...state,
    createEvent,
    reset,
  };
}
