import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type AdminRegisterPayload,
  type AdminRegisterResponse,
  adminRegisterResponseSchema
} from "../../../../domain/models/admin/admin.registerPayload.schema";

export function createAdminRegisterRepo(supabase: SupabaseClient) {
  return {
    async register(input: AdminRegisterPayload): Promise<AdminRegisterResponse> {
      const { data, error } = await supabase.functions.invoke("admin-register", { body: input });

      if (error) throw error; 
      if (!data) throw new Error("ADMIN_REGISTER_EMPTY_RESPONSE");


      return adminRegisterResponseSchema.parse(data);
    },
  };
}

