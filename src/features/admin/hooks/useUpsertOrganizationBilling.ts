import { useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { makeOrganizationBillingRepo } from "../../../gateways/supabase/repositories/dashboard/makeOrganizationBillingRepo";

import type {
  OrganizationBilling,
  OrganizationBillingPatch,
} from "../../../domain/models/db/db.organizationBilling.schema";

import { normalizeError } from "../../../domain/errors/errors";

/* ------------------------------------------------------------------ */
/* Types UI                                                            */
/* ------------------------------------------------------------------ */

type State = {
  loading: boolean;
  error: string | null;
  updated: OrganizationBilling | null;
};

/* ------------------------------------------------------------------ */
/* Hook                                                                */
/* ------------------------------------------------------------------ */

export function useUpsertOrganizationBilling(params: { supabase: SupabaseClient }) {
  const { supabase } = params;

  const repo = useMemo(() => makeOrganizationBillingRepo(supabase), [supabase]);

  const [state, setState] = useState<State>({
    loading: false,
    error: null,
    updated: null,
  });

  async function upsertOrganizationBilling(
    input: OrganizationBillingPatch
  ): Promise<OrganizationBilling | null> {
    try {
      setState((s) => ({ ...s, loading: true, error: null, updated: null }));

      const updated = await repo.upsertOrganizationBilling(input);

      setState({ loading: false, error: null, updated });
      return updated;
    } catch (e: unknown) {
      const ne = normalizeError(e, "Impossible de sauvegarder les infos de facturation");
      setState({ loading: false, error: ne.message, updated: null });
      return null;
    }
  }

  function reset() {
    setState({ loading: false, error: null, updated: null });
  }

  return {
    ...state,
    upsertOrganizationBilling,
    reset,
  };
}
