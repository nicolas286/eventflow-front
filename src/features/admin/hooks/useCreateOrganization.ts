// src/features/admin/hooks/useCreateOrganization.ts
import { useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createOrganizationsRepo } from "../../../gateways/supabase/repositories/dashboard/createOrganizationRepo";
import type {
  CreateOrganizationForm,
  CreateOrganizationResult,
} from "../../../domain/models/admin/admin.createOrganization.schema";
import { normalizeError } from "../../../domain/errors/errors";

type State = {
  loading: boolean;
  error: string | null;
  createdOrgId: CreateOrganizationResult | null;
};

export function useCreateOrganization(params: { supabase: SupabaseClient }) {
  const { supabase } = params;

  const organizationsRepo = useMemo(
    () => createOrganizationsRepo(supabase),
    [supabase]
  );

  const [state, setState] = useState<State>({
    loading: false,
    error: null,
    createdOrgId: null,
  });

  async function createOrganization(
    input: CreateOrganizationForm
  ): Promise<CreateOrganizationResult | null> {
    try {
      setState({ loading: true, error: null, createdOrgId: null });

      const createdOrgId = await organizationsRepo.createOrganization(input);

      setState({
        loading: false,
        error: null,
        createdOrgId,
      });

      return createdOrgId;
    } catch (e: unknown) {
      const ne = normalizeError(e, "Impossible de créer l’organisation");
      setState({
        loading: false,
        error: ne.message,
        createdOrgId: null,
      });
      return null;
    }
  }

  function reset() {
    setState({ loading: false, error: null, createdOrgId: null });
  }

  return {
    ...state,
    createOrganization,
    reset,
  };
}
