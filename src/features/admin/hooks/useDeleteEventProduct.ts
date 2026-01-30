import { useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { deleteEventProductRepo } from "../../../gateways/supabase/repositories/dashboard/deleteEventProductRepo";
import { normalizeError } from "../../../domain/errors/errors";

export type DeleteEventProductInput = {
  id: string; // event_product_id
};

type State = {
  loading: boolean;
  error: string | null;
  deletedId: string | null;
};

export function useDeleteEventProduct(params: { supabase: SupabaseClient }) {
  const { supabase } = params;

  const repo = useMemo(() => deleteEventProductRepo(supabase), [supabase]);

  const [state, setState] = useState<State>({
    loading: false,
    error: null,
    deletedId: null,
  });

  async function deleteEventProduct(input: DeleteEventProductInput): Promise<boolean> {
    try {
      setState({ loading: true, error: null, deletedId: null });

      await repo.deleteEventProduct(input);

      setState({
        loading: false,
        error: null,
        deletedId: input.id,
      });

      return true;
    } catch (e: unknown) {
      const ne = normalizeError(e, "Impossible de supprimer le produit");

      setState({
        loading: false,
        error: ne.message,
        deletedId: null,
      });

      return false;
    }
  }

  function reset() {
    setState({ loading: false, error: null, deletedId: null });
  }

  return { ...state, deleteEventProduct, reset };
}
