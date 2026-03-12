import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { makeSearchEventAdminOrdersViewRepo } from "../data/admin.searchEventOrdersViewRepo";
import type { EventAdminOrdersView } from "../schemas/admin.eventOrdersView.schema";
import { normalizeError } from "@errors/errors";

type FilterMode = "all" | "order" | `field:${string}`;

type State = {
  loading: boolean;
  error: string | null;
  data: EventAdminOrdersView | null;
};

function createSearchEventAdminOrdersViewStore(
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
        "Impossible de rechercher dans les commandes de l’événement",
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

export function useSearchEventAdminOrdersViewData(params: {
  supabase: SupabaseClient;
  orgId: string | null | undefined;
  eventSlug: string | null | undefined;
  query: string;
  filterMode: FilterMode;
  enabled?: boolean;
  ordersLimit?: number;
  ordersOffset?: number;
}) {
  const {
    supabase,
    orgId,
    eventSlug,
    query,
    filterMode,
    enabled = true,
    ordersLimit,
    ordersOffset = 0,
  } = params;

  const searchRepo = useMemo(
    () => makeSearchEventAdminOrdersViewRepo(supabase),
    [supabase],
  );

  const trimmedQuery = query.trim();
  const searchEnabled = enabled && Boolean(orgId) && Boolean(eventSlug) && trimmedQuery.length > 0;

  const loadFn = useCallback(async () => {
    if (!orgId || !eventSlug || !trimmedQuery) {
      return { data: null };
    }

    const data = await searchRepo.searchEventAdminOrdersView({
      orgId,
      eventSlug,
      query: trimmedQuery,
      filterMode,
      ordersLimit,
      ordersOffset,
    });

    return { data };
  }, [
    orgId,
    eventSlug,
    trimmedQuery,
    filterMode,
    searchRepo,
    ordersLimit,
    ordersOffset,
  ]);

  const store = useMemo(
    () => createSearchEventAdminOrdersViewStore(loadFn, searchEnabled),
    [loadFn, searchEnabled],
  );

  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);

  return {
    ...state,
    refetch: store.refetch,
  };
}