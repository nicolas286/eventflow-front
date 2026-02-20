import type { SupabaseClient } from "@supabase/supabase-js";
import {
  deleteAccountInputSchema,
  deleteAccountResultSchema,
  type DeleteAccountInput,
  type DeleteAccountResult,
} from "../../../../domain/models/admin/admin.deleteAccount.schema";

export function deleteAccountRepo(supabase: SupabaseClient) {
  return {
    async deleteAccount(input?: DeleteAccountInput): Promise<DeleteAccountResult> {
      const payload = deleteAccountInputSchema.parse(input ?? {});

      const { data, error } = await supabase.functions.invoke("delete-account", {
        body: payload,
      });

      if (error) throw error;
      if (!data) throw new Error("DELETE_ACCOUNT_EMPTY_RESPONSE");

      if (data.ok === false) {
        throw new Error(String(data.error ?? "DELETE_ACCOUNT_FAILED"));
      }

      return deleteAccountResultSchema.parse(data);
    },
  };
}
