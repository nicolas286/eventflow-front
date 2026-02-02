import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseSafe } from "../../supabaseSafe";
import { camelToSnake } from "../../../../domain/helpers/camelToSnake";
import { snakeToCamel } from "../../../../domain/helpers/snakeToCamel";

import {
  eventFormFieldSchema,
  type EventFormField,
} from "../../../../domain/models/db/db.eventFormFields.schema";

import { updateEventFormFieldPatchSchema, type UpdateEventFormFieldPatch } from "../../../../domain/models/admin/admin.updateEventFormFieldPatch.schema";


function normalizePatch(patch: UpdateEventFormFieldPatch): UpdateEventFormFieldPatch {
  const out: UpdateEventFormFieldPatch = { ...patch };

  // exemples utiles (tu peux enlever si tu veux strict):
  if ("options" in out) out.options = out.options ?? null;

  // garde-fous fréquents
  if ("label" in out) out.label = out.label?.trim() ?? out.label;
  if ("fieldKey" in out) out.fieldKey = out.fieldKey?.trim() ?? out.fieldKey;

  return out;
}

export function updateEventFormFieldRepo(supabase: SupabaseClient) {
  return {
    async updateEventFormField(input: {
      fieldId: string;
      patch: Omit<UpdateEventFormFieldPatch, "id">; // on force fieldId séparé, comme productId dans ton exemple
    }): Promise<EventFormField> {
      const fieldId = input.fieldId;
      if (!fieldId) throw new Error("VALIDATION_ERROR: fieldId is required");

      const validated = updateEventFormFieldPatchSchema.parse({
        id: fieldId,
        ...input.patch,
      });

      const { id: _ignored, ...patchOnly } = validated;

      const normalizedPatch = normalizePatch(patchOnly as any);

      // patch vide => refetch
      if (Object.keys(normalizedPatch).length === 0) {
        const row = await supabaseSafe(() =>
          supabase.from("event_form_fields").select("*").eq("id", fieldId).single()
        );
        return eventFormFieldSchema.parse(snakeToCamel(row));
      }

      const payload = camelToSnake(normalizedPatch);

      const row = await supabaseSafe(() =>
        supabase
          .from("event_form_fields")
          .update(payload)
          .eq("id", fieldId)
          .select("*")
          .single()
      );

      return eventFormFieldSchema.parse(snakeToCamel(row));
    },
  };
}
