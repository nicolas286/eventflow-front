import { useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createEventFormFieldGroupRepo } from "@app/modules/admin/forms/data/createEventFormFieldGroupRepo";
import type { CreateEventFormFieldGroupInput } from "../schemas/admin.createEventFormFieldGroupInput.schema";
import type { EventFormFieldGroup } from "@shared/models/db/db.eventFormFields.schema";
import { normalizeError } from "@errors/errors";

type State = {
  loading: boolean;
  error: string | null;
  created: EventFormFieldGroup | null;
};

export function useCreateEventFormFieldGroup(params: { supabase: SupabaseClient }) {
  const { supabase } = params;

  const repo = useMemo(() => createEventFormFieldGroupRepo(supabase), [supabase]);

  const [state, setState] = useState<State>({
    loading: false,
    error: null,
    created: null,
  });

  async function createEventFormFieldGroup(
    input: CreateEventFormFieldGroupInput
  ): Promise<EventFormFieldGroup | null> {
    try {
      setState({ loading: true, error: null, created: null });

      const created = await repo.createEventFormFieldGroup(input);

      setState({ loading: false, error: null, created });
      return created;
    } catch (e: unknown) {
      const ne = normalizeError(e, "Impossible de créer le groupe de champs.");
      setState({ loading: false, error: ne.message, created: null });
      return null;
    }
  }

  function reset() {
    setState({ loading: false, error: null, created: null });
  }

  return {
    ...state,
    createEventFormFieldGroup,
    reset,
  };
}