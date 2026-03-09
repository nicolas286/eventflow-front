import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { makeEventTicketsAdminRepo } from "../data/makeEventTicketsRepo";
import type { GetEventTicketsAdminResponse } from "../schemas/admin.eventTickets.schema";
import { normalizeError } from "@errors/errors";

type State = {
  loading: boolean;
  error: string | null;
  data: GetEventTicketsAdminResponse | null;
};

function createAdminSingleEventTicketsStore(
  loadFn: () => Promise<Omit<State, "loading" | "error">>,
  enabled: boolean,
) {
  let state: State = {
    loading: enabled,
    error: null,
    data: null,
  };

  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());

  let started = false;

  async function load() {
    if (!enabled) {
      state = { ...state, loading: false };
      emit();
      return;
    }

    state = { ...state, loading: true, error: null };
    emit();

    try {
      const next = await loadFn();
      state = { loading: false, error: null, ...next };
      emit();
    } catch (e: unknown) {
      const ne = normalizeError(
        e,
        "Impossible de charger les billets de l’événement",
      );
      state = { ...state, loading: false, error: ne.message };
      emit();
    }
  }

  function ensureStarted() {
    if (started || !enabled) return;
    started = true;
    void load();
  }

  return {
    subscribe(cb: () => void) {
      ensureStarted();
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getSnapshot() {
      return state;
    },
    refetch() {
      return load();
    },
  };
}

export function useAdminSingleEventTicketsData(params: {
  supabase: SupabaseClient;
  eventId: string | null | undefined;
  enabled?: boolean;
  limit?: number;
  offset?: number;
}) {
  const {
    supabase,
    eventId,
    enabled = true,
    limit,
    offset = 0,
  } = params;

  const ticketsRepo = useMemo(
    () => makeEventTicketsAdminRepo(supabase),
    [supabase],
  );

  const loadFn = useCallback(async () => {
    if (!eventId) {
      return { data: null };
    }

    const data = await ticketsRepo.getEventTicketsAdmin({
      eventId,
      limit,
      offset,
    });

    return { data };
  }, [eventId, ticketsRepo, limit, offset]);

  const store = useMemo(
    () => createAdminSingleEventTicketsStore(loadFn, enabled),
    [loadFn, enabled],
  );

  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);

  return {
    ...state,
    refetch: store.refetch,
  };
}