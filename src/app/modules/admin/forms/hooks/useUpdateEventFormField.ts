import { useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { updateEventFormFieldRepo } from "@app/modules/admin/forms/data/updateEventFormFieldRepo";
import type { EventFormField } from "@shared/models/db/db.eventFormFields.schema";
import type { UpdateEventFormFieldPatch } from "../schemas/admin.updateEventFormFieldPatch.schema";
import { normalizeError } from "@errors/errors";

type State = {
  loading: boolean;
  error: string | null;
  updated: EventFormField | null;
};

type UpdateEventFormFieldResult =
  | { ok: true; data: EventFormField }
  | { ok: false; error: string };

export function useUpdateEventFormField(params: { supabase: SupabaseClient }) {
  const { supabase } = params;

  const repo = useMemo(() => updateEventFormFieldRepo(supabase), [supabase]);

  const [state, setState] = useState<State>({
    loading: false,
    error: null,
    updated: null,
  });

  async function updateEventFormField(input: {
  fieldId: string;
  patch: Omit<UpdateEventFormFieldPatch, "id">;
}): Promise<UpdateEventFormFieldResult> {
  try {
    setState({ loading: true, error: null, updated: null });

    const updated = await repo.updateEventFormField({
      fieldId: input.fieldId,
      patch: input.patch,
    });

    setState({ loading: false, error: null, updated });

    return { ok: true, data: updated };
  } catch (e: unknown) {
    const ne = normalizeError(e, "Impossible de modifier le champ de formulaire.");

    setState({ loading: false, error: ne.message, updated: null });

    return { ok: false, error: ne.message };
  }
}

  function reset() {
    setState({ loading: false, error: null, updated: null });
  }

  return {
    ...state,
    updateEventFormField,
    reset,
  };
}
