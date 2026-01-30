import { useCallback, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createEventProductRepo } from "../../../gateways/supabase/repositories/dashboard/createEventProductRepo";
import type { CreateEventProductInput } from "../../../domain/models/admin/admin.createEventProduct.schema";
import type { EventProduct } from "../../../domain/models/db/db.eventProducts.schema";
import { normalizeError } from "../../../domain/errors/errors";

type State = {
  loading: boolean;
  error: string | null;
  data: EventProduct | null;
};

export function useCreateEventProduct(params: { supabase: SupabaseClient }) {
  const { supabase } = params;

  const repo = useMemo(() => createEventProductRepo(supabase), [supabase]);

  const [state, setState] = useState<State>({
    loading: false,
    error: null,
    data: null,
  });

  const reset = useCallback(() => {
    setState({ loading: false, error: null, data: null });
  }, []);

  const createEventProduct = useCallback(
    async (input: CreateEventProductInput): Promise<EventProduct> => {
      setState((s) => ({ ...s, loading: true, error: null }));

      try {
        const data = await repo.createEventProduct(input);
        setState({ loading: false, error: null, data });
        return data;
      } catch (e: unknown) {
        const ne = normalizeError(e, "Impossible de créer le produit");
        setState((s) => ({ ...s, loading: false, error: ne.message }));
        throw e;
      }
    },
    [repo]
  );

  return {
    ...state,
    createEventProduct,
    reset,
  };
}
