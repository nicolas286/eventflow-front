import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseSafe } from "@gateways/supabase/supabaseSafe";
import {
  invoicesListResponseSchema,
  type InvoicesListResponse,
} from "@shared/models/db/db.invoice.schema";

import { listInvoicesParamsSchema,
  rpcListInvoicesArgsSchema,
  type ListInvoicesParams
 } from "../schemas/admin.makeInvoiceListArgs.schema";


export function makeInvoiceListRepo(supabase: SupabaseClient) {
  return {
    async listInvoices(params: ListInvoicesParams): Promise<InvoicesListResponse> {
      const validated = listInvoicesParamsSchema.parse(params);

      const candidate = {
        p_org_id: validated.orgId,
        p_limit: validated.limit ?? 25,
        ...(validated.cursor?.id
          ? {
              p_cursor_issued_at: validated.cursor.issuedAt ?? null,
              p_cursor_id: validated.cursor.id,
            }
          : {}),
      };

      const payload = rpcListInvoicesArgsSchema.parse(candidate);

      const raw = await supabaseSafe<unknown>(() => supabase.rpc("rpc_list_invoices", payload));

      return invoicesListResponseSchema.parse(raw);
    },
  };
}
