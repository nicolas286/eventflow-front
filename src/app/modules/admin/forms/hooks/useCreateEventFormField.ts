import { useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createEventFormFieldRepo } from "@app/modules/admin/forms/data/createEventFormFieldRepo";
import type { CreateEventFormFieldInput } from "../schemas/admin.createFormField.schema";
import type { EventFormField } from "@shared/models/db/db.eventFormFields.schema";
import { normalizeError } from "@errors/errors";

type State = {
  loading: boolean;
  error: string | null;
  created: EventFormField | null;
};

type CreateEventFormFieldResult =
  | { ok: true; data: EventFormField }
  | { ok: false; error: string };

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
): Promise<CreateEventFormFieldResult> {
  try {
    setState({ loading: true, error: null, created: null });

    const created = await repo.createEventFormField(input);

    setState({ loading: false, error: null, created });

    return { ok: true, data: created };
  } catch (e: unknown) {
    const ne = normalizeError(e, "Impossible de créer le champ de formulaire.");

    setState({ loading: false, error: ne.message, created: null });

    return { ok: false, error: ne.message };
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
