import { useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { makePublicEventDetailRepo } from "../../../gateways/supabase/repositories/public/makePublicEventDetailRepo";
import type { PublicEventDetail } from "../../../domain/models/public/public.eventDetailBySlug.schema";
import { normalizeError } from "../../../domain/errors/errors";

type State = {
  loading: boolean;
  error: string | null;
  data: PublicEventDetail | null;
};

export function usePublicEventDetail(params: {
  supabase: SupabaseClient;
  orgSlug: string | null | undefined;
  eventSlug: string | null | undefined;
}) {
  const { supabase, orgSlug, eventSlug } = params;

  const repo = useMemo(() => makePublicEventDetailRepo(supabase), [supabase]);

  const [state, setState] = useState<State>({
    loading: true,
    error: null,
    data: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        if (!orgSlug || !eventSlug) {
          setState({ loading: false, error: null, data: null });
          return;
        }

        setState((s) => ({ ...s, loading: true, error: null }));

        const data = await repo.getPublicEventDetail(orgSlug, eventSlug);
        if (cancelled) return;

        setState({ loading: false, error: null, data });
      } catch (e: unknown) {
        if (cancelled) return;
        const ne = normalizeError(e,  "Impossible de charger les détails de l’événement");
        setState((s) => ({ ...s, loading: false, error: ne.message }));
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [repo, orgSlug, eventSlug]);

  return state;
}
