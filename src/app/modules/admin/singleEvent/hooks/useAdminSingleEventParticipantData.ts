import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { makeEventDetailAdminParticipantsRepo } from "../data/makeEventDetailAdminParticipantsRepo";
import type { EventDetailAdminParticipants } from "../schemas/admin.eventDetail.schema";
import { normalizeError } from "@errors/errors";

type State = {
  loading: boolean;
  error: string | null;
  data: EventDetailAdminParticipants | null;
};

function createAdminSingleEventParticipantsStore(
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
        "Impossible de charger les participants de l’événement",
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

export function useAdminSingleEventParticipantsData(params: {
  supabase: SupabaseClient;
  orgId: string | null | undefined;
  eventSlug: string | null | undefined;
  enabled?: boolean;

  attendeesLimit?: number;
  attendeesOffset?: number;
}) {
  const {
    supabase,
    orgId,
    eventSlug,
    enabled = true,
    attendeesLimit,
    attendeesOffset = 0,
  } = params;

  const detailRepo = useMemo(
    () => makeEventDetailAdminParticipantsRepo(supabase),
    [supabase],
  );

  const loadFn = useCallback(async () => {
    if (!orgId || !eventSlug) {
      return { data: null };
    }

    const data = await detailRepo.getEventDetailAdminParticipants({
      orgId,
      eventSlug,
      attendeesLimit,
      attendeesOffset,
    });

    return { data };
  }, [
    orgId,
    eventSlug,
    detailRepo,
    attendeesLimit,
    attendeesOffset,
  ]);

  const store = useMemo(
    () => createAdminSingleEventParticipantsStore(loadFn, enabled),
    [loadFn, enabled],
  );

  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);

  return {
    ...state,
    refetch: store.refetch,
  };
}