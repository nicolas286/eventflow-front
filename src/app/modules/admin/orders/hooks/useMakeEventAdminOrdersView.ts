import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { makeEventAdminOrdersViewRepo } from "../data/makeEventAdminOrdersViewRepo";
import type { EventAdminOrdersView } from "../schemas/admin.eventOrdersView.schema";
import { normalizeError } from "@errors/errors";

type State = {
  loading: boolean;
  error: string | null;
  data: EventAdminOrdersView | null;
};

function createAdminSingleEventOrdersViewStore(
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
        "Impossible de charger les commandes de l’événement",
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

export function useAdminSingleEventOrdersViewData(params: {
  supabase: SupabaseClient;
  orgId: string | null | undefined;
  eventSlug: string | null | undefined;
  enabled?: boolean;
  ordersLimit?: number;
  ordersOffset?: number;
}) {
  const {
    supabase,
    orgId,
    eventSlug,
    enabled = true,
    ordersLimit,
    ordersOffset = 0,
  } = params;

  const ordersRepo = useMemo(
    () => makeEventAdminOrdersViewRepo(supabase),
    [supabase],
  );

  const loadFn = useCallback(async () => {
    if (!orgId || !eventSlug) {
      return { data: null };
    }

    const data = await ordersRepo.getEventAdminOrdersView({
      orgId,
      eventSlug,
      ordersLimit,
      ordersOffset,
    });

    return { data };
  }, [
    orgId,
    eventSlug,
    ordersRepo,
    ordersLimit,
    ordersOffset,
  ]);

  const store = useMemo(
    () => createAdminSingleEventOrdersViewStore(loadFn, enabled),
    [loadFn, enabled],
  );

  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);

  return {
    ...state,
    refetch: store.refetch,
  };
}