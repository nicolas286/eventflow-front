import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { edgeSafe } from "@shared/gateways/supabase/supabaseEdgeSafe";

const getInvoicePdfUrlInputSchema = z.object({
  invoiceId: z.string().uuid(),
});

const getInvoicePdfUrlResponseSchema = z.object({
  url: z.string().url(),
  expiresIn: z.number().int().positive(),
});

export type GetInvoicePdfUrlInput = z.infer<typeof getInvoicePdfUrlInputSchema>;
export type GetInvoicePdfUrlResponse = z.infer<typeof getInvoicePdfUrlResponseSchema>;

export function invoicePdfRepo(supabase: SupabaseClient) {
  return {
    async getPdfUrl(input: GetInvoicePdfUrlInput): Promise<GetInvoicePdfUrlResponse> {
      const payload = getInvoicePdfUrlInputSchema.parse(input);

      const raw = await edgeSafe(
        () =>
          supabase.functions.invoke("get-invoice-pdf-url", {
            body: {
              invoice_id: payload.invoiceId,
            },
          }),
        "GET_INVOICE_PDF_URL_EMPTY_RESPONSE"
      );

      return getInvoicePdfUrlResponseSchema.parse(raw);
    },
  };
}