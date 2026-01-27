import { useEffect, useMemo, useState } from "react";
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

export function useAdminDashboardData(params: { supabase: SupabaseClient }) {
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
        const orgId = bootstrap.organization?.id
          ? String(bootstrap.organization.id)
          : null;

        if (cancelled) return;

        // onboarding: pas d’orga -> pas d’appel events
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
          events: eventsOverview.events,
        });
      } catch (e: unknown) {
        if (cancelled) return;

        const ne = normalizeError(
          e,
          "Impossible de charger les données du dashboard"
        );

        setState((s) => ({
          ...s,
          loading: false,
          error: ne.message,
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
