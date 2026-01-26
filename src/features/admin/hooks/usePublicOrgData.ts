import { useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { makePublicOrgRepo } from "../../../gateways/supabase/repositories/public/makePublicOrgRepo";
import { makePublicEventsRepo } from "../../../gateways/supabase/repositories/public/makePublicEventsRepo";

import type { PublicOrgBySlug } from "../../../domain/models/publicOrgBySlug.schema";
import type { PublicEventOverview } from "../../../domain/models/publicOrgEventsOverview.schema";

type State = {
  loading: boolean;
  error: string | null;

  orgSlug: string | null;

  org: PublicOrgBySlug["org"] | null;
  profile: PublicOrgBySlug["profile"] | null;

  events: PublicEventOverview[];
};

export function usePublicOrgData(params: {
  supabase: SupabaseClient;
  orgSlug: string | null | undefined;
}) {
  const { supabase, orgSlug } = params;

  const orgRepo = useMemo(() => makePublicOrgRepo(supabase), [supabase]);
  const eventsRepo = useMemo(() => makePublicEventsRepo(supabase), [supabase]);

  const [state, setState] = useState<State>({
    loading: true,
    error: null,

    orgSlug: orgSlug ? String(orgSlug) : null,

    org: null,
    profile: null,
    events: [],
  });

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const slug = (orgSlug ?? "").trim();

      if (!slug) {
        setState({
          loading: false,
          error: "Slug manquant",
          orgSlug: null,
          org: null,
          profile: null,
          events: [],
        });
        return;
      }

      try {
        setState((s) => ({
          ...s,
          loading: true,
          error: null,
          orgSlug: slug,
          org: null,
          profile: null,
          events: [],
        }));

        // 1) org info
        const orgData = await orgRepo.getPublicOrgBySlug(slug);
        if (cancelled) return;

        // 2) events
        const overview = await eventsRepo.getPublicOrgEventsOverview(slug);
        if (cancelled) return;

        setState({
          loading: false,
          error: null,
          orgSlug: slug,
          org: orgData.org,
          profile: orgData.profile,
          events: overview.events,
        });
      } catch (e: any) {
        if (cancelled) return;

        setState({
          loading: false,
          error: e?.message ?? "Erreur inconnue",
          orgSlug: slug,
          org: null,
          profile: null,
          events: [],
        });
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [orgSlug, orgRepo, eventsRepo]);

  return state;
}
