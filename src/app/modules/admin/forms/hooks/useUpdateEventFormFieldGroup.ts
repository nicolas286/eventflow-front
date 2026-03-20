import { useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { updateEventFormFieldGroupRepo } from "@app/modules/admin/forms/data/updateEventFormFieldGroupRepo";
import type { EventFormFieldGroup } from "@shared/models/db/db.eventFormFields.schema";
import type { UpdateEventFormFieldGroupPatch } from "../schemas/admin.updateEventFormFieldGroupPatch.schema";
import { normalizeError } from "@errors/errors";

type State = {
  loading: boolean;
  error: string | null;
  updated: EventFormFieldGroup | null;
};

export function useUpdateEventFormFieldGroup(params: { supabase: SupabaseClient }) {
  const { supabase } = params;

  const repo = useMemo(() => updateEventFormFieldGroupRepo(supabase), [supabase]);

  const [state, setState] = useState<State>({
    loading: false,
    error: null,
    updated: null,
  });

  async function updateEventFormFieldGroup(input: {
    groupId: string;
    patch: Omit<UpdateEventFormFieldGroupPatch, "id">;
  }): Promise<EventFormFieldGroup | null> {
    try {
      setState({ loading: true, error: null, updated: null });

      const updated = await repo.updateEventFormFieldGroup({
        groupId: input.groupId,
        patch: input.patch,
      });

      setState({ loading: false, error: null, updated });
      return updated;
    } catch (e: unknown) {
      const ne = normalizeError(e, "Impossible de modifier le groupe de champs.");
      setState({ loading: false, error: ne.message, updated: null });
      return null;
    }
  }

  function reset() {
    setState({ loading: false, error: null, updated: null });
  }

  return {
    ...state,
    updateEventFormFieldGroup,
    reset,
  };
}