import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseSafe } from "@gateways/supabase/supabaseSafe";
import { snakeToCamel } from "@helpers/snakeToCamel";
import { camelToSnake } from "@helpers/camelToSnake";

import { profileSchema, type Profile } from "@shared/models/db/db.profile.schema";
import { updateAdminProfileInputSchema,
  type UpdateAdminProfileInput
 } from "../schemas/admin.updateAdminProfile.schema";

export function updateAdminProfileRepo(supabase: SupabaseClient) {
  return {
    async updateAdminProfile(input: UpdateAdminProfileInput): Promise<Profile> {
      const parsed = updateAdminProfileInputSchema.parse(input);

      const dbPatch = camelToSnake(parsed.patch);

      const raw = await supabaseSafe(() =>
        supabase
          .from("user_profile")
          .update(dbPatch)
          .eq("user_id", parsed.userId)
          .select(
            [
              "user_id",
              "first_name",
              "last_name",
              "phone",
              "address_line1",
              "address_line2",
              "postal_code",
              "city",
              "country_code",
              "created_at",
              "updated_at",
            ].join(", ")
          )
          .single()
      );

      const camel = snakeToCamel(raw);
      return profileSchema.parse(camel);
    },
  };
}
