import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseSafe } from "@gateways/supabase/supabaseSafe";

import {
  deleteEventFormFieldGroupInputSchema,
  type DeleteEventFormFieldGroupInput,
} from "../schemas/admin.deleteEventFormFieldGroupInput.schema";

export function deleteEventFormFieldGroupRepo(supabase: SupabaseClient) {
  return {
    async deleteEventFormFieldGroup(
      input: DeleteEventFormFieldGroupInput,
    ): Promise<void> {
      const { id } = deleteEventFormFieldGroupInputSchema.parse(input);

      const raw = await supabaseSafe<{ id: string }[]>(() =>
        supabase
          .from("event_form_field_groups")
          .delete()
          .eq("id", id)
          .select("id"),
      );

      if (raw.length === 0) {
        throw new Error("NOT_FOUND");
      }
    },
  };
}