import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AdminRegisterPayload,
  AdminRegisterResponse,
} from "../../../../domain/models/admin/admin.registerPayload.schema";

export function createAdminRegisterRepo(supabase: SupabaseClient) {
  return {
    async register(input: AdminRegisterPayload): Promise<AdminRegisterResponse> {
      const { data, error } = await supabase.functions.invoke("admin-register", {
        body: input,
      });

      if (error) {
        const details =
          (error as any)?.context?.body ??
          (error as any)?.message ??
          String(error);

        throw new Error(details);
      }

      if (!data) {
        throw new Error("ADMIN_REGISTER_EMPTY_RESPONSE");
      }

      return data as AdminRegisterResponse;
    },
  };
}
