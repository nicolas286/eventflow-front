import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseSafe } from "../../supabaseSafe";
import { deleteEventFormFieldInputSchema, 
  type DeleteEventFormFieldInput } from "../../../../domain/models/admin/admin.deleteEventFormFieldInput.schema";


export function deleteEventFormFieldRepo(supabase: SupabaseClient) {
  return {
    async deleteEventFormField(input: DeleteEventFormFieldInput): Promise<void> {
      const { id } = deleteEventFormFieldInputSchema.parse(input);

      const raw = await supabaseSafe<{ id: string }[]>(
        () =>
          supabase
            .from("event_form_fields")
            .delete()
            .eq("id", id)
            .select("id"),
      );

      if (raw.length === 0) {
        // ici on veut une erreur métier propre
        throw new Error("NOT_FOUND");
    }
  },
  };
}
