import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseSafe } from "@gateways/supabase/supabaseSafe";
import { snakeToCamel } from "@helpers/snakeToCamel";
import { publicEventDetailSchema, 
  type PublicEventDetail
 } from "../schemas/public.eventDetailBySlug.schema";

export function makePublicEventDetailRepo(supabase: SupabaseClient) {
  return {
    async getPublicEventDetail(
      orgSlug: string,
      eventSlug: string
    ): Promise<PublicEventDetail> {
      const raw = await supabaseSafe(() =>
        supabase.rpc("get_public_event_detail", {
          p_org_slug: orgSlug,
          p_event_slug: eventSlug,
        })
      );

      const camel = snakeToCamel(raw);
      return publicEventDetailSchema.parse(camel);
    },
  };
}
