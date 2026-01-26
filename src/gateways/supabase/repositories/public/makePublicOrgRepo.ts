import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseSafe } from "../../supabaseSafe";
import { snakeToCamel } from "../../../../domain/helpers/snakeToCamel";
import {
  publicOrgBySlugSchema,
  type PublicOrgBySlug,
} from "../../../../domain/models/publicOrgBySlug.schema";

export function makePublicOrgRepo(supabase: SupabaseClient) {
  return {
    async getPublicOrgBySlug(slug: string): Promise<PublicOrgBySlug> {
      const raw = await supabaseSafe(() =>
        supabase.rpc("get_public_org_by_slug", { p_slug: slug })
      );

      const camel = snakeToCamel(raw);
      return publicOrgBySlugSchema.parse(camel);
    },
  };
}
