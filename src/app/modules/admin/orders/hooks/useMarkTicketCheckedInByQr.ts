import { useCallback, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { normalizeError } from "@errors/errors";

import { markTicketCheckedInByQrRepo } from "../data/markTicketCheckedInByQrRepo";
import type { MarkTicketCheckedInByQrResponse } from "../schemas/admin.markTicketCheckedIn.schema";

export function useMarkTicketCheckedInByQr(params: { supabase: SupabaseClient }) {
  const { supabase } = params;

  const repo = useMemo(() => markTicketCheckedInByQrRepo(supabase), [supabase]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const markTicketCheckedInByQr = useCallback(
  async (qrToken: string, eventId: string): Promise<MarkTicketCheckedInByQrResponse> => {
    try {
      setLoading(true);
      setError(null);

      const data = await repo.markTicketCheckedInByQr({ qrToken, eventId });
      return data;
    } catch (e: unknown) {
      const ne = normalizeError(e, "Impossible de valider le ticket via le QR code");
      setError(ne.message);
      throw new Error(ne.message);
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
    markTicketCheckedInByQr,
  };
}