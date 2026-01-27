import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseSafe } from "../../supabaseSafe";
import { camelToSnake } from "../../../../domain/helpers/camelToSnake";
import { snakeToCamel } from "../../../../domain/helpers/snakeToCamel";
import {
  createEventInputSchema,
  type CreateEventInput,
} from "../../../../domain/models/admin/admin.createEvent.schema";
import {
  eventSchema,
  type Event,
} from "../../../../domain/models/db/db.event.schema";


export function createEventsRepo(supabase: SupabaseClient) {
  return {
    async createEvent(input: CreateEventInput): Promise<Event> {
      // 1) Validate front payload (Zod) BEFORE sending anything
      const validated = createEventInputSchema.parse(input);

      // 2) Convert camelCase -> snake_case for RPC input
      const payload = camelToSnake(validated);

      // 3) Call RPC (adjust name if yours differs)
      const raw = await supabaseSafe(() =>
        supabase.rpc("create_event", { p_input: payload })
      );

      // 4) Convert response -> camelCase then parse
      const camel = snakeToCamel(raw);
      return eventSchema.parse(camel);
    },
  };
}
