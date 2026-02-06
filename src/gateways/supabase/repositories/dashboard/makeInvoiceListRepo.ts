import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseSafe } from "../../supabaseSafe";
import { snakeToCamel } from "../../../../domain/helpers/snakeToCamel";
import {
  invoicesListResponseSchema,
  type InvoicesListResponse,
} from "../../../../domain/models/db/db.invoice.schema";

export type InvoiceListCursor = {
  issuedAt: string | null;
  id: string; // uuid
};

export type ListInvoicesParams = {
  orgId: string;
  limit?: number;
  cursor?: InvoiceListCursor | null;
};

/**
 * Repo: list invoices via RPC
 *
 * RPC:
 *  - rpc_list_invoices(
 *      p_org_id uuid,
 *      p_limit int default 25,
 *      p_cursor_issued_at timestamptz default null,
 *      p_cursor_id uuid default null
 *    )
 *
 * Returns:
 *  - { orgId, items: Invoice[], nextCursor }
 */
export function makeInvoiceListRepo(supabase: SupabaseClient) {
  return {
    async listInvoices(params: ListInvoicesParams): Promise<InvoicesListResponse> {
      const payload: Record<string, any> = {
        p_org_id: params.orgId,
        p_limit: params.limit ?? 25,
      };

      if (params.cursor?.id) {
        payload.p_cursor_issued_at = params.cursor.issuedAt; // can be null
        payload.p_cursor_id = params.cursor.id;
      }

      const raw = await supabaseSafe(() => supabase.rpc("rpc_list_invoices", payload));

      return invoicesListResponseSchema.parse(raw);
    },
  };
}
