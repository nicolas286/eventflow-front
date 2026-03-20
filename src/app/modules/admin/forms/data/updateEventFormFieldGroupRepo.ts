import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseSafe } from "@gateways/supabase/supabaseSafe";
import { camelToSnake } from "@helpers/camelToSnake";
import { snakeToCamel } from "@helpers/snakeToCamel";

import { eventFormFieldGroupSchema,
    type EventFormFieldGroup, 
 } from "@shared/models/db/db.eventFormFields.schema";

import {
  updateEventFormFieldGroupPatchSchema,
  type UpdateEventFormFieldGroupPatch,
} from "../schemas/admin.updateEventFormFieldGroupPatch.schema";

function normalizePatch(
  patch: Omit<UpdateEventFormFieldGroupPatch, "id">,
): Omit<UpdateEventFormFieldGroupPatch, "id"> {
  const out = { ...patch };

  if ("label" in out) out.label = out.label?.trim() ?? out.label;

  return out;
}

export function updateEventFormFieldGroupRepo(supabase: SupabaseClient) {
  return {
    async updateEventFormFieldGroup(input: {
      groupId: string;
      patch: Omit<UpdateEventFormFieldGroupPatch, "id">;
    }): Promise<EventFormFieldGroup> {
      const groupId = input.groupId;
      if (!groupId) throw new Error("VALIDATION_ERROR: groupId is required");

      const validated = updateEventFormFieldGroupPatchSchema.parse({
        id: groupId,
        ...input.patch,
      });

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _ignored, ...patchOnly } = validated;

      const normalizedPatch = normalizePatch(patchOnly);

      if (Object.keys(normalizedPatch).length === 0) {
        const row = await supabaseSafe(() =>
          supabase
            .from("event_form_field_groups")
            .select("*")
            .eq("id", groupId)
            .single(),
        );

        return eventFormFieldGroupSchema.parse(snakeToCamel(row));
      }

      const payload = camelToSnake(normalizedPatch);

      const row = await supabaseSafe(() =>
        supabase
          .from("event_form_field_groups")
          .update(payload)
          .eq("id", groupId)
          .select("*")
          .single(),
      );

      return eventFormFieldGroupSchema.parse(snakeToCamel(row));
    },
  };
}