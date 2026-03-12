import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { makeEventTicketsAdminSearchRepo } from "../data/admin.searchEventTicketsViewRepo";
import type { GetEventTicketsAdminResponse } from "../../singleEvent/schemas/admin.eventTickets.schema";
import { normalizeError } from "@errors/errors";

type State = {
  loading: boolean;
  error: string | null;
  data: GetEventTicketsAdminResponse | null;
};

function createSearchEventAdminTicketsStore(
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
        "Impossible de rechercher dans les tickets de l’événement",
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

export function useSearchEventAdminTicketsData(params: {
  supabase: SupabaseClient;
  eventId: string | null | undefined;
  query: string;
  enabled?: boolean;
  limit?: number;
  offset?: number;
}) {
  const {
    supabase,
    eventId,
    query,
    enabled = true,
    limit,
    offset = 0,
  } = params;

  const searchRepo = useMemo(
    () => makeEventTicketsAdminSearchRepo(supabase),
    [supabase],
  );

  const trimmedQuery = query.trim();
  const searchEnabled = enabled && Boolean(eventId) && trimmedQuery.length > 0;

  const loadFn = useCallback(async () => {
    if (!eventId || !trimmedQuery) {
      return { data: null };
    }

    const data = await searchRepo.searchEventTicketsAdmin({
      eventId,
      query: trimmedQuery,
      limit,
      offset,
    });

    return { data };
  }, [eventId, trimmedQuery, searchRepo, limit, offset]);

  const store = useMemo(
    () => createSearchEventAdminTicketsStore(loadFn, searchEnabled),
    [loadFn, searchEnabled],
  );

  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);

  return {
    ...state,
    refetch: store.refetch,
  };
}