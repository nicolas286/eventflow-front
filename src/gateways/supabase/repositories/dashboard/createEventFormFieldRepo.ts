import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseSafe } from "../../supabaseSafe";
import { camelToSnake } from "../../../../domain/helpers/camelToSnake";
import { snakeToCamel } from "../../../../domain/helpers/snakeToCamel";

import { createEventFormFieldInputSchema, 
    type CreateEventFormFieldInput
 } from "../../../../domain/models/admin/admin.createFormField.schema";

 import { eventFormFieldSchema,
    type EventFormField
  } from "../../../../domain/models/db/db.eventFormFields.schema";

export function createEventFormFieldRepo(supabase: SupabaseClient) {
  return {
    async createEventFormField(input: CreateEventFormFieldInput): Promise<EventFormField> {

      const validated = createEventFormFieldInputSchema.parse(input);
      const payload = camelToSnake(validated);

      const raw = await supabaseSafe(() =>
        supabase.rpc("create_event_form_field", { p_input: payload })
      );

      const camel = snakeToCamel(raw);
      return eventFormFieldSchema.parse(camel);
    },
  };
}
