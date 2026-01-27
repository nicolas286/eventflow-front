import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseSafe } from "../../supabaseSafe";
import { camelToSnake } from "../../../../domain/helpers/camelToSnake";
import { snakeToCamel } from "../../../../domain/helpers/snakeToCamel";
import type { Event } from "../../../../domain/models/db/db.event.schema";
import { eventSchema } from "../../../../domain/models/db/db.event.schema";
import type { UpdateEventInput } from "../../../../features/admin/hooks/useUpdateEvent";

export function makeUpdateEventRepo(supabase: SupabaseClient) {
  return {
    async updateEvent(input: UpdateEventInput): Promise<Event> {
      const flat = { eventId: input.eventId, ...input.patch };
      const payload = camelToSnake(flat);

      const raw = await supabaseSafe(() =>
        supabase.rpc("update_event", { p_input: payload })
      );

      const camel = snakeToCamel(raw);
      return eventSchema.parse(camel);
    },
  };
}
