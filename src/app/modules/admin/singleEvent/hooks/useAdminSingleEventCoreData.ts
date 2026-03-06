import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { makeEventDetailAdminCoreRepo } from "../data/makeEventDetailAdminCoreRepo";
import type { EventDetailAdminCore } from "../schemas/admin.eventDetail.schema";
import { normalizeError } from "@errors/errors";

type State = {
  loading: boolean;
  error: string | null;

  eventId: string | null;
  data: EventDetailAdminCore | null;
};

function createAdminSingleEventCoreStore(
  loadFn: () => Promise<Omit<State, "loading" | "error">>,
) {
  let state: State = {
    loading: true,
    error: null,
    eventId: null,
    data: null,
  };

  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());

  let started = false;

  async function load() {
    state = { ...state, loading: true, error: null };
    emit();

    try {
      const next = await loadFn();
      state = { loading: false, error: null, ...next };
      emit();
    } catch (e: unknown) {
      const ne = normalizeError(
        e,
        "Impossible de charger les données principales admin de l’événement",
      );
      state = { ...state, loading: false, error: ne.message };
      emit();
    }
  }

  function ensureStarted() {
    if (started) return;
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

export function useAdminSingleEventCoreData(params: {
  supabase: SupabaseClient;
  orgId: string | null | undefined;
  eventSlug: string | null | undefined;

  ordersLimit?: number;
  ordersOffset?: number;
}) {
  const {
    supabase,
    orgId,
    eventSlug,
    ordersLimit = 50,
    ordersOffset = 0,
  } = params;

  const detailRepo = useMemo(
    () => makeEventDetailAdminCoreRepo(supabase),
    [supabase],
  );

  const loadFn = useCallback(async () => {
    if (!orgId || !eventSlug) {
      return { eventId: null, data: null };
    }

    const data = await detailRepo.getEventDetailAdminCore({
      orgId,
      eventSlug,
      ordersLimit,
      ordersOffset,
    });

    const eventId = data?.event?.id ?? null;

    return { eventId, data };
  }, [
    orgId,
    eventSlug,
    detailRepo,
    ordersLimit,
    ordersOffset,
  ]);

  const store = useMemo(
    () => createAdminSingleEventCoreStore(loadFn),
    [loadFn],
  );

  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);

  return {
    ...state,
    refetch: store.refetch,
  };
}