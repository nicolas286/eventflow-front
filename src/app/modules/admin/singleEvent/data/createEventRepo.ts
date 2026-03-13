import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseSafe } from "@gateways/supabase/supabaseSafe";
import { camelToSnake } from "@helpers/camelToSnake";
import { snakeToCamel } from "@helpers/snakeToCamel";

import {
  createEventInputSchema,
  type CreateEventInput,
} from "../../events/schemas/admin.createEvent.schema";

import { duplicateEventInputSchema,
  type DuplicateEventInput
 } from "../schemas/admin.duplicateEvent.schema";

import { eventSchema, type Event } from "@shared/models/db/db.event.schema";

export function createEventsRepo(supabase: SupabaseClient) {
  return {
    async createEvent(input: CreateEventInput): Promise<Event> {
      const validated = createEventInputSchema.parse(input);
      const payload = camelToSnake(validated);

      const raw = await supabaseSafe<unknown>(
        () => supabase.rpc("create_event", { p_input: payload })
      );

      const camel = snakeToCamel(raw);
      return eventSchema.parse(camel);
    },

    async duplicateEvent(input: DuplicateEventInput): Promise<Event> {
      const validated = duplicateEventInputSchema.parse(input);
      const payload = camelToSnake(validated);

      const raw = await supabaseSafe<unknown>(
        () => supabase.rpc("duplicate_event", { p_input: payload })
      );

      const camel = snakeToCamel(raw);
      return eventSchema.parse(camel);
    },
  };
}