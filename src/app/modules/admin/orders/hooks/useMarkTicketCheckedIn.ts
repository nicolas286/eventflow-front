import { useCallback, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { normalizeError } from "@errors/errors";

import { markTicketCheckedInRepo } from "../data/markTicketChekedInRepo";
import type { MarkTicketCheckedInResponse } from "../schemas/admin.markTicketCheckedIn.schema";

export function useMarkTicketCheckedIn(params: { supabase: SupabaseClient }) {
  const { supabase } = params;

  const repo = useMemo(() => markTicketCheckedInRepo(supabase), [supabase]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const markTicketCheckedIn = useCallback(
    async (ticketId: string): Promise<MarkTicketCheckedInResponse | null> => {
      try {
        setLoading(true);
        setError(null);

        const data = await repo.markTicketCheckedIn({ ticketId });
        return data;
      } catch (e: unknown) {
        const ne = normalizeError(e, "Impossible de marquer le ticket comme utilisé");
        setError(ne.message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [repo],
  );

  const reset = useCallback(() => {
    setError(null);
  }, []);

  return {
    loading,
    error,
    reset,
    markTicketCheckedIn,
  };
}