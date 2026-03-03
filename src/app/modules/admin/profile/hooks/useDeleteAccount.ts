import { useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { deleteAccountRepo } from "../data/deleteAccountRepo";
import { normalizeError } from "@errors/errors";

export type DeleteAccountInput = {
  orgId?: string; // optionnel (MVP 1 org / 1 user)
};

type State = {
  loading: boolean;
  error: string | null;
  deleted: boolean;
};

export function useDeleteAccount(params: { supabase: SupabaseClient }) {
  const { supabase } = params;

  const repo = useMemo(() => deleteAccountRepo(supabase), [supabase]);

  const [state, setState] = useState<State>({
    loading: false,
    error: null,
    deleted: false,
  });

  async function deleteAccount(input?: DeleteAccountInput): Promise<boolean> {
    try {
      setState({ loading: true, error: null, deleted: false });

      await repo.deleteAccount(input);

      setState({
        loading: false,
        error: null,
        deleted: true,
      });

      return true;
    } catch (e: unknown) {
      const ne = normalizeError(e, "Impossible de supprimer le compte");

      setState({
        loading: false,
        error: ne.message,
        deleted: false,
      });

      return false;
    }
  }

  function reset() {
    setState({ loading: false, error: null, deleted: false });
  }

  return { ...state, deleteAccount, reset };
}
