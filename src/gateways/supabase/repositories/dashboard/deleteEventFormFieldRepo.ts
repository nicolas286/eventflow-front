import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseSafe } from "../../supabaseSafe";

type DeleteEventFormFieldInput = {
  id: string;
};

export function deleteEventFormFieldRepo(supabase: SupabaseClient) {
  return {
    async deleteEventFormField(input: DeleteEventFormFieldInput): Promise<void> {
      const { id } = input;

      if (!id) {
        throw new Error("deleteEventFormField: field ID is required");
      }

      const raw = await supabaseSafe(() =>
        supabase
          .from("event_form_fields")
          .delete()
          .eq("id", id)
          .select("id")
      );

      const deletedCount = Array.isArray(raw) ? raw.length : 0;

      if (deletedCount === 0) {
        throw new Error(
          "deleteEventFormField: nothing deleted (not found or forbidden)"
        );
      }
    },
  };
}
