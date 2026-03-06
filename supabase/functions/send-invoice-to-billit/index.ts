import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function esc(v: string | null | undefined): string {
  if (!v) return "";
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function money(cents: number): string {
  return (cents / 100).toFixed(2);
}

function isoDate(d: string | Date | null | undefined): string {
  if (!d) return new Date().toISOString().slice(0, 10);
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toISOString().slice(0, 10);
}

function safeStr(v: unknown, max = 500) {
  const s = String(v ?? "");
  return s.length > max ? s.slice(0, max) : s;
}

function hasBuyerPeppolData(billing: any): boolean {
  // En pratique, l’envoi Peppol à un client B2B sans TVA est souvent impossible/non pertinent.
  // On considère "applicable" uniquement si TVA est là.
  const vatCountry = String(billing?.vatCountryCode ?? "").trim();
  const vatNumber = String(billing?.vatNumber ?? "").trim();
  return Boolean(vatCountry && vatNumber);
}

/* ------------------------------------------------------------------ */
/* UBL Builder (minimal Peppol BE)                                    */
/* ------------------------------------------------------------------ */

function buildUblInvoice(invoice: any): string {
  const billing = invoice.billing_snapshot?.billing ?? {};

  const sellerName = "Eventflow";
  const sellerVat = "BE0840386125";
  const sellerCountry = "BE";

  const buyerName = billing.legalName;
  const buyerVat =
    billing.vatCountryCode && billing.vatNumber ? `${billing.vatCountryCode}${billing.vatNumber}` : null;

  const currency = invoice.currency ?? "EUR";

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice
  xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">

  <cbc:CustomizationID>urn:cen.eu:en16931:2017</cbc:CustomizationID>
  <cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>

  <cbc:ID>${esc(invoice.number)}</cbc:ID>
  <cbc:IssueDate>${isoDate(invoice.issued_at ?? invoice.issuedAt)}</cbc:IssueDate>
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${currency}</cbc:DocumentCurrencyCode>

  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>${esc(sellerName)}</cbc:Name>
      </cac:PartyName>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${sellerVat}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PostalAddress>
        <cac:Country>
          <cbc:IdentificationCode>${sellerCountry}</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
    </cac:Party>
  </cac:AccountingSupplierParty>

  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>${esc(buyerName)}</cbc:Name>
      </cac:PartyName>

      ${buyerVat ? `
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${esc(buyerVat)}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
      ` : ""}

      <cac:PostalAddress>
        <cbc:StreetName>${esc(billing.addressLine1)}</cbc:StreetName>
        <cbc:AdditionalStreetName>${esc(billing.addressLine2)}</cbc:AdditionalStreetName>
        <cbc:CityName>${esc(billing.city)}</cbc:CityName>
        <cbc:PostalZone>${esc(billing.postalCode)}</cbc:PostalZone>
        <cac:Country>
          <cbc:IdentificationCode>${esc(billing.countryCode)}</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
    </cac:Party>
  </cac:AccountingCustomerParty>

  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${currency}">${money(invoice.subtotal_cents ?? invoice.subtotalCents ?? 0)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${currency}">${money(invoice.subtotal_cents ?? invoice.subtotalCents ?? 0)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${currency}">${money(invoice.total_cents ?? invoice.totalCents ?? 0)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${currency}">${money(invoice.total_cents ?? invoice.totalCents ?? 0)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>

  <cac:InvoiceLine>
    <cbc:ID>1</cbc:ID>
    <cbc:InvoicedQuantity unitCode="C62">1</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${currency}">${money(invoice.subtotal_cents ?? invoice.subtotalCents ?? 0)}</cbc:LineExtensionAmount>

    <cac:Item>
      <cbc:Name>Abonnement Eventflow</cbc:Name>
    </cac:Item>

    <cac:Price>
      <cbc:PriceAmount currencyID="${currency}">${money(invoice.subtotal_cents ?? invoice.subtotalCents ?? 0)}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>

</Invoice>`;
}

/* ------------------------------------------------------------------ */
/* Edge handler                                                       */
/* ------------------------------------------------------------------ */

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const { invoice_id } = await req.json().catch(() => ({}));
    if (!invoice_id) return json({ ok: false, error: "invoice_id required" }, 200);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const billitKey = Deno.env.get("BILLIT_API_KEY");

    /* 1) Fetch invoice (keep it minimal) */
    const { data: invoice, error } = await supabase
      .from("invoices")
      .select("id, number, currency, subtotal_cents, vat_cents, total_cents, issued_at, paid_at, billing_snapshot, pdf_path")
      .eq("id", invoice_id)
      .maybeSingle();

    if (error || !invoice) {
      return json({ ok: false, error: "invoice_not_found" }, 200);
    }

    const billing = invoice.billing_snapshot?.billing ?? {};

    /* 2) Create/Update Peppol row => "sending" (optional, mais propre) */
    await supabase.rpc("rpc_update_invoice_peppol_status", {
      p_input: { invoice_id, status: "sending" },
    });

    /* 3) If Billit not configured => SKIP */
    if (!billitKey) {
      await supabase.rpc("rpc_update_invoice_peppol_status", {
        p_input: {
          invoice_id,
          status: "skipped",
          error_message: "Billit not configured (missing BILLIT_API_KEY)",
        },
      });

      return json({ ok: true, skipped: true, reason: "billit_not_configured" }, 200);
    }

    /* 4) If buyer has no VAT => SKIP (not applicable) */
    if (!hasBuyerPeppolData(billing)) {
      await supabase.rpc("rpc_update_invoice_peppol_status", {
        p_input: {
          invoice_id,
          status: "skipped",
          error_message: "Peppol not applicable (missing buyer VAT)",
        },
      });

      return json({ ok: true, skipped: true, reason: "peppol_not_applicable_missing_vat" }, 200);
    }

    /* 5) Ensure PDF exists (idempotent) */
    if (!invoice.pdf_path) {
      fetch(`${supabaseUrl}/functions/v1/generate-invoice-pdf`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ invoice_id }),
      }).catch((e) => console.error("[billit-edge] generate pdf call failed", e));
      // on ne bloque pas ici; si tu veux être strict: await + re-fetch invoice.pdf_path
    }

    /* 6) Generate UBL */
    const ublXml = buildUblInvoice(invoice);

    /* 7) Send to Billit */
    const res = await fetch("https://api.billit.be/v1/peppol/outgoing", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${billitKey}`,
        "Content-Type": "application/xml",
      },
      body: ublXml,
    });

    const text = await res.text();

    if (!res.ok) {
      await supabase.rpc("rpc_update_invoice_peppol_status", {
        p_input: {
          invoice_id,
          status: "failed",
          error_message: safeStr(text, 500),
        },
      });

      return json({ ok: false, error: "billit_send_failed" }, 200);
    }

    let payload: any = {};
    try {
      payload = JSON.parse(text);
    } catch {
      payload = {};
    }

    /* 8) Update status -> sent */
    await supabase.rpc("rpc_update_invoice_peppol_status", {
      p_input: {
        invoice_id,
        status: "sent",
        provider_message_id: payload.message_id ?? null,
      },
    });

    return json({ ok: true, messageId: payload.message_id ?? null }, 200);
  } catch (e) {
    console.error("[billit-edge]", e);
    return json({ ok: false, error: "unexpected" }, 200);
  }
});
