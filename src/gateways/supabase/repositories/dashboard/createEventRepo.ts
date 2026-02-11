import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseSafe } from "../../supabaseSafe";
import { camelToSnake } from "../../../../domain/helpers/camelToSnake";
import { snakeToCamel } from "../../../../domain/helpers/snakeToCamel";
import {
  createEventInputSchema,
  type CreateEventInput,
} from "../../../../domain/models/admin/admin.createEvent.schema";
import { eventSchema, type Event } from "../../../../domain/models/db/db.event.schema";

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
  };
}
