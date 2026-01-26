import { useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { makeDashboardRepo, type DashboardBootstrap } from "../../../gateways/supabase/repositories/dashboard/dashboardBootstrapRepo";
import { makeEventsRepo, type EventsOverview } from "../../../gateways/supabase/repositories/dashboard/getEventOverviewRepo";

// ⚠️ adapte si tu as déjà un type Event “UI”
export type UiEvent = {
  id: string;
  title?: string | null;
  status?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;

  // stats (depuis get_events_overview)
  ordersCount: number;
  paidCents: number;

  // garde l’objet brut si tes features en ont besoin
  raw: any;
};

type State = {
  loading: boolean;
  error: string | null;

  bootstrap: DashboardBootstrap | null;
  orgId: string | null;

  eventsOverview: EventsOverview | null;
  events: UiEvent[];
};

function toUiEvent(row: { event: any; ordersCount: number; paidCents: number }): UiEvent {
  const e = row.event ?? {};
  return {
    id: String(e.id),
    title: e.title ?? e.name ?? null,
    status: e.status ?? null,
    startsAt: e.starts_at ?? e.startsAt ?? null,
    endsAt: e.ends_at ?? e.endsAt ?? null,
    ordersCount: Number(row.ordersCount ?? 0),
    paidCents: Number(row.paidCents ?? 0),
    raw: e,
  };
}

export function useAdminDashboardData(params: {
  supabase: SupabaseClient;
}) {
  const { supabase } = params;

  const dashboardRepo = useMemo(() => makeDashboardRepo(supabase), [supabase]);
  const eventsRepo = useMemo(() => makeEventsRepo(supabase), [supabase]);

  const [state, setState] = useState<State>({
    loading: true,
    error: null,
    bootstrap: null,
    orgId: null,
    eventsOverview: null,
    events: [],
  });

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setState((s) => ({ ...s, loading: true, error: null }));

        // 1) bootstrap (org via membership)
        const bootstrap = await dashboardRepo.getDashboardBootstrap();
        const orgId = bootstrap.organization?.id ? String(bootstrap.organization.id) : null;

        if (cancelled) return;

        // si pas d’org -> onboarding (pas d’appel events)
        if (!orgId) {
          setState({
            loading: false,
            error: null,
            bootstrap,
            orgId: null,
            eventsOverview: null,
            events: [],
          });
          return;
        }

        // 2) events overview
        const eventsOverview = await eventsRepo.getEventsOverview(orgId);

        if (cancelled) return;

        setState({
          loading: false,
          error: null,
          bootstrap,
          orgId,
          eventsOverview,
          events: (eventsOverview.events ?? []).map(toUiEvent),
        });
      } catch (e: any) {
        if (cancelled) return;
        setState((s) => ({
          ...s,
          loading: false,
          error: e?.message ?? "Erreur inconnue",
        }));
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [dashboardRepo, eventsRepo]);

  return state;
}
