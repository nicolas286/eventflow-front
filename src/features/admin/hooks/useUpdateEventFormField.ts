import { useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { updateEventFormFieldRepo } from "../../../gateways/supabase/repositories/dashboard/updateEventFormFieldRepo";
import type { EventFormField } from "../../../domain/models/db/db.eventFormFields.schema";
import type { UpdateEventFormFieldPatch } from "../../../domain/models/admin/admin.updateEventFormFieldPatch.schema";
import { normalizeError } from "../../../domain/errors/errors";

type State = {
  loading: boolean;
  error: string | null;
  updated: EventFormField | null;
};

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
  }): Promise<EventFormField | null> {
    try {
      setState({ loading: true, error: null, updated: null });

      const updated = await repo.updateEventFormField({
        fieldId: input.fieldId,
        patch: input.patch,
      });

      setState({ loading: false, error: null, updated });
      return updated;
    } catch (e: unknown) {
      const ne = normalizeError(e, "Impossible de modifier le champ de formulaire.");
      setState({ loading: false, error: ne.message, updated: null });
      return null;
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
