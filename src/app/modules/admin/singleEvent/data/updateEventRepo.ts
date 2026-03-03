import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseSafe } from "../../../../../shared/gateways/supabase/supabaseSafe";
import { camelToSnake } from "../../../../../shared/helpers/camelToSnake";
import { snakeToCamel } from "../../../../../shared/helpers/snakeToCamel";
import type { Event } from "../../../../../shared/models/db/db.event.schema";
import { eventSchema } from "../../../../../shared/models/db/db.event.schema";
import type { UpdateEventInput } from "../hooks/useUpdateEvent";
import type { UpdateEventPatch } from "../schemas/admin.updateEventPatch.schema";

export function makeUpdateEventRepo(supabase: SupabaseClient) {
  return {
    async updateEvent(input: UpdateEventInput<UpdateEventPatch>): Promise<Event> {
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
