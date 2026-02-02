import { useCallback, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createEventFormFieldRepo } from "../../../gateways/supabase/repositories/dashboard/createEventFormFieldRepo";
import type { CreateEventFormFieldInput } from "../../../domain/models/admin/admin.createFormField.schema";
import type { EventFormField } from "../../../domain/models/db/db.eventFormFields.schema";
import { normalizeError } from "../../../domain/errors/errors";

type State = {
  loading: boolean;
  error: string | null;
  data: EventFormField | null;
};

export function useCreateEventProduct(params: { supabase: SupabaseClient }) {
  const { supabase } = params;

  const repo = useMemo(() => createEventFormFieldRepo(supabase), [supabase]);

  const [state, setState] = useState<State>({
    loading: false,
    error: null,
    data: null,
  });

  const reset = useCallback(() => {
    setState({ loading: false, error: null, data: null });
  }, []);

  const createEventProduct = useCallback(
    async (input: CreateEventFormFieldInput): Promise<EventFormField> => {
      setState((s) => ({ ...s, loading: true, error: null }));

      try {
        const data = await repo.createEventFormField(input);
        setState({ loading: false, error: null, data });
        return data;
      } catch (e: unknown) {
        const ne = normalizeError(e, "Impossible de créer le champ de formulaire.");
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
