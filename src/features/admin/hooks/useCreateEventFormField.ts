import { useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createEventFormFieldRepo } from "../../../gateways/supabase/repositories/dashboard/createEventFormFieldRepo";
import type { CreateEventFormFieldInput } from "../../../domain/models/admin/admin.createFormField.schema";
import type { EventFormField } from "../../../domain/models/db/db.eventFormFields.schema";
import { normalizeError } from "../../../domain/errors/errors";

type State = {
  loading: boolean;
  error: string | null;
  created: EventFormField | null;
};

export function useCreateEventFormField(params: { supabase: SupabaseClient }) {
  const { supabase } = params;

  const repo = useMemo(() => createEventFormFieldRepo(supabase), [supabase]);

  const [state, setState] = useState<State>({
    loading: false,
    error: null,
    created: null,
  });

  async function createEventFormField(
    input: CreateEventFormFieldInput
  ): Promise<EventFormField | null> {
    try {
      setState({ loading: true, error: null, created: null });

      const created = await repo.createEventFormField(input);

      setState({ loading: false, error: null, created });
      return created;
    } catch (e: unknown) {
      const ne = normalizeError(e, "Impossible de créer le champ de formulaire.");
      setState({ loading: false, error: ne.message, created: null });
      return null;
    }
  }

  function reset() {
    setState({ loading: false, error: null, created: null });
  }

  return {
    ...state,
    createEventFormField,
    reset,
  };
}
