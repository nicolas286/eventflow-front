import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseSafe } from "../../../../../shared/gateways/supabase/supabaseSafe";
import { camelToSnake } from "../../../../../shared/helpers/camelToSnake";
import { snakeToCamel } from "../../../../../shared/helpers/snakeToCamel";

import {
  createEventFormFieldGroupInputSchema,
  type CreateEventFormFieldGroupInput,
} from "../schemas/admin.createEventFormFieldGroupInput.schema";

import { eventFormFieldGroupSchema, 
    type EventFormFieldGroup
 } from "@shared/models/db/db.eventFormFields.schema";

export function createEventFormFieldGroupRepo(supabase: SupabaseClient) {
  return {
    async createEventFormFieldGroup(
      input: CreateEventFormFieldGroupInput,
    ): Promise<EventFormFieldGroup> {
      const validated = createEventFormFieldGroupInputSchema.parse(input);
      const payload = camelToSnake(validated);

      const raw = await supabaseSafe<unknown>(() =>
        supabase.rpc("create_event_form_field_group", { p_input: payload }),
      );

      const camel = snakeToCamel(raw);
      return eventFormFieldGroupSchema.parse(camel);
    },
  };
}