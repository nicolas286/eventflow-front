import { useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { deleteOrderRepo } from "../data/deleteOrderRepo";
import { normalizeError } from "@errors/errors";

export type DeleteOrderInput = {
  orderId: string;
};

type State = {
  loading: boolean;
  error: string | null;
  deletedId: string | null;
};

export function useDeleteOrder(params: { supabase: SupabaseClient }) {
  const { supabase } = params;

  const repo = useMemo(() => deleteOrderRepo(supabase), [supabase]);

  const [state, setState] = useState<State>({
    loading: false,
    error: null,
    deletedId: null,
  });

  async function deleteOrder(input: DeleteOrderInput): Promise<boolean> {
    try {
      setState({ loading: true, error: null, deletedId: null });

      await repo.deleteOrder({ id: input.orderId });

      setState({
        loading: false,
        error: null,
        deletedId: input.orderId,
      });

      return true;
    } catch (e: unknown) {
      const ne = normalizeError(e, "Impossible de supprimer la commande");

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

  return { ...state, deleteOrder, reset };
}
