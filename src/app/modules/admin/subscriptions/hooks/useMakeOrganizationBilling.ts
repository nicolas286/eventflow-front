import { useCallback, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { makeOrganizationBillingRepo } from "../data/makeOrganizationBillingRepo";
import type { OrganizationBilling } from "@shared/models/db/db.organizationBilling.schema";
import { normalizeError } from "@errors/errors";

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

type State = {
  loading: boolean;
  error: string | null;
  billing: OrganizationBilling | null;
};

/* ------------------------------------------------------------------ */
/* Hook                                                                 */
/* ------------------------------------------------------------------ */

export function useMakeOrganizationBilling(params: { supabase: SupabaseClient }) {
  const { supabase } = params;

  const repo = useMemo(() => makeOrganizationBillingRepo(supabase), [supabase]);

  const [state, setState] = useState<State>({
    loading: false,
    error: null,
    billing: null,
  });

  const fetchBilling = useCallback(
    async (orgId: string): Promise<OrganizationBilling | null> => {
      try {
        setState((s) => ({ ...s, loading: true, error: null }));

        const billing = await repo.getOrganizationBilling(orgId);

        setState({ loading: false, error: null, billing });
        return billing;
      } catch (e: unknown) {
        const ne = normalizeError(e, "Impossible de charger les infos de facturation");
        setState({ loading: false, error: ne.message, billing: null });
        return null;
      }
    },
    [repo]
  );

  function reset() {
    setState({ loading: false, error: null, billing: null });
  }

  return {
    ...state,
    fetchBilling,
    reset,
  };
}
