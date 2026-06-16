import { useCallback, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { updateEventProductRepo } from "@app/modules/admin/products/data/updateEventProductRepo";
import type { UpdateEventProductPatch } from "@app/modules/admin/products/data/updateEventProductRepo";
import type { EventProduct } from "@shared/models/db/db.eventProducts.schema";
import { normalizeError } from "@errors/errors";

type State = {
  loading: boolean;
  error: string | null;
  data: EventProduct | null;
};

export function useUpdateEventProduct(params: { supabase: SupabaseClient }) {
  const { supabase } = params;

  const repo = useMemo(() => updateEventProductRepo(supabase), [supabase]);

  const [state, setState] = useState<State>({
    loading: false,
    error: null,
    data: null,
  });

  const reset = useCallback(() => {
    setState({ loading: false, error: null, data: null });
  }, []);

  const updateEventProduct = useCallback(
    async (input: { productId: string; patch: UpdateEventProductPatch }): Promise<EventProduct> => {
      setState((s) => ({ ...s, loading: true, error: null }));

      try {
        const data = await repo.updateEventProduct(input);
        setState({ loading: false, error: null, data });
        return data;
      } catch (e: unknown) {
        const ne = normalizeError(e, "Impossible de mettre à jour le produit");
        setState((s) => ({ ...s, loading: false, error: ne.message }));
        throw ne;
      }
    },
    [repo]
  );

  return {
    ...state,
    updateEventProduct,
    reset,
  };
}
