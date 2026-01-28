import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { makeAdminEventsLookupRepo } from "../../../gateways/supabase/repositories/dashboard/makeAdminEventsLookupRepo";
import { makeEventDetailAdminRepo } from "../../../gateways/supabase/repositories/dashboard/makeEventDetailRepo";
import type { EventDetailAdmin } from "../../../domain/models/admin/admin.eventDetail.schema";
import { normalizeError } from "../../../domain/errors/errors";

type State = {
  loading: boolean;
  error: string | null;

  eventId: string | null;
  data: EventDetailAdmin | null;
};

function createAdminSingleEventStore(loadFn: () => Promise<Omit<State, "loading" | "error">>) {
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
      const ne = normalizeError(e, "Impossible de charger les détails admin de l’événement");
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

export function useAdminSingleEventData(params: {
  supabase: SupabaseClient;
  orgId: string | null | undefined;
  eventSlug: string | null | undefined;

  ordersLimit?: number;
  ordersOffset?: number;
  attendeesLimit?: number;
  attendeesOffset?: number;
}) {
  const {
    supabase,
    orgId,
    eventSlug,
    ordersLimit = 50,
    ordersOffset = 0,
    attendeesLimit = 50,
    attendeesOffset = 0,
  } = params;

  const lookupRepo = useMemo(() => makeAdminEventsLookupRepo(supabase), [supabase]);
  const detailRepo = useMemo(() => makeEventDetailAdminRepo(supabase), [supabase]);

  const loadFn = useCallback(async () => {
    if (!orgId || !eventSlug) {
      return { eventId: null, data: null };
    }

    // 1) slug -> id
    const eventId = await lookupRepo.getEventIdBySlug({ orgId, eventSlug });

    // 2) id -> detail rpc
    const data = await detailRepo.getEventDetailAdmin({
      eventId,
      ordersLimit,
      ordersOffset,
      attendeesLimit,
      attendeesOffset,
    });

    return { eventId, data };
  }, [
    orgId,
    eventSlug,
    lookupRepo,
    detailRepo,
    ordersLimit,
    ordersOffset,
    attendeesLimit,
    attendeesOffset,
  ]);

  const store = useMemo(() => createAdminSingleEventStore(loadFn), [loadFn]);

  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);

  return {
    ...state,
    refetch: store.refetch,
  };
}
