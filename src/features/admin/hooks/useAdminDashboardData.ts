import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { makeDashboardRepo } from "../../../gateways/supabase/repositories/dashboard/makeDashboardRepo";
import { makeEventsRepo } from "../../../gateways/supabase/repositories/dashboard/makeEventsRepo";
import type { DashboardBootstrap } from "../../../domain/models/admin/admin.dashboardBootstrap.schema";
import type { EventsOverview, EventOverviewRow } from "../../../domain/models/admin/admin.eventsOverview.schema";
import { normalizeError } from "../../../domain/errors/errors";

type State = {
  loading: boolean;
  error: string | null;

  bootstrap: DashboardBootstrap | null;
  orgId: string | null;

  eventsOverview: EventsOverview | null;
  events: EventOverviewRow[];
};

// mini store (external system)
function createAdminDashboardStore(loadFn: () => Promise<State>) {
  let state: State = {
    loading: true,
    error: null,
    bootstrap: null,
    orgId: null,
    eventsOverview: null,
    events: [],
  };

  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());

  let started = false;

  async function load() {
    // set loading
    state = { ...state, loading: true, error: null };
    emit();

    try {
      const next = await loadFn();
      state = next;
      emit();
    } catch (e: unknown) {
      const ne = normalizeError(e, "Impossible de charger les données du dashboard");
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
    // react external store API
    subscribe(cb: () => void) {
      ensureStarted();
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getSnapshot() {
      return state;
    },

    // action
    refetch() {
      return load();
    },
  };
}

export function useAdminDashboardData(params: { supabase: SupabaseClient }) {
  const { supabase } = params;

  const dashboardRepo = useMemo(() => makeDashboardRepo(supabase), [supabase]);
  const eventsRepo = useMemo(() => makeEventsRepo(supabase), [supabase]);

  // load function (returns full next state)
  const loadFn = useCallback(async (): Promise<State> => {
    // 1) bootstrap
    const bootstrap = await dashboardRepo.getDashboardBootstrap();
    const orgId = bootstrap.organization?.id ? String(bootstrap.organization.id) : null;

    // onboarding: pas d’orga
    if (!orgId) {
      return {
        loading: false,
        error: null,
        bootstrap,
        orgId: null,
        eventsOverview: null,
        events: [],
      };
    }

    // 2) events overview
    const eventsOverview = await eventsRepo.getEventsOverview(orgId);

    return {
      loading: false,
      error: null,
      bootstrap,
      orgId,
      eventsOverview,
      events: eventsOverview.events,
    };
  }, [dashboardRepo, eventsRepo]);

  // store stable for this hook instance
  const store = useMemo(() => createAdminDashboardStore(loadFn), [loadFn]);

  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);

  return {
    ...state,
    refetch: store.refetch,
  };
}
