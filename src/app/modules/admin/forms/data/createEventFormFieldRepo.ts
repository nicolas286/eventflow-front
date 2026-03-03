import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseSafe } from "../../../../../shared/gateways/supabase/supabaseSafe";
import { camelToSnake } from "../../../../../shared/helpers/camelToSnake";
import { snakeToCamel } from "../../../../../shared/helpers/snakeToCamel";

import { createEventFormFieldInputSchema,
  type CreateEventFormFieldInput
 } from "../schemas/admin.createFormField.schema";

 import { eventFormFieldSchema,
    type EventFormField
  } from "../../../../../shared/models/db/db.eventFormFields.schema";

export function createEventFormFieldRepo(supabase: SupabaseClient) {
  return {
    async createEventFormField(input: CreateEventFormFieldInput): Promise<EventFormField> {

      const validated = createEventFormFieldInputSchema.parse(input);
      const payload = camelToSnake(validated);

      const raw = await supabaseSafe<unknown>(() =>
  supabase.rpc("create_event_form_field", { p_input: payload }),
);

      const camel = snakeToCamel(raw);
      return eventFormFieldSchema.parse(camel);
    },
  };
}
