import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
/* ------------------------------------------------------------------ */ /* Helpers                                                            */ /* ------------------------------------------------------------------ */ function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8"
    }
  });
}
function esc(v) {
  if (!v) return "";
  return String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
function money(cents) {
  return (cents / 100).toFixed(2);
}
function isoDate(d) {
  if (!d) return new Date().toISOString().slice(0, 10);
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toISOString().slice(0, 10);
}
function safeStr(v, max = 500) {
  const s = String(v ?? "");
  return s.length > max ? s.slice(0, max) : s;
}
function clean(v, fallback = "") {
  const s = String(v ?? "").trim();
  return s || fallback;
}
function toVatPercent(vatCents, subtotalCents) {
  if (!subtotalCents || subtotalCents <= 0) return "0";
  const pct = vatCents / subtotalCents * 100;
  return Number.isFinite(pct) ? pct.toFixed(2).replace(/\.00$/, "") : "0";
}
function hasBuyerPeppolData(billing) {
  const legalName = String(billing?.legalName ?? "").trim();
  const countryCode = String(billing?.countryCode ?? "").trim();
  const vatCountryCode = String(billing?.vatCountryCode ?? "").trim();
  const vatNumber = String(billing?.vatNumber ?? "").trim();
  return Boolean(legalName && countryCode && vatCountryCode && vatNumber);
}
/* ------------------------------------------------------------------ */ /* UBL Builder                                                        */ /* ------------------------------------------------------------------ */ 
function buildUblInvoice(invoice, env) {
  const billing = invoice.billing_snapshot?.billing ?? {};
  const sellerName = clean(env.BILLIT_SELLER_NAME, "Eventflow");
  const sellerVat = clean(env.BILLIT_SELLER_VAT);
  const sellerCountry = clean(env.BILLIT_SELLER_COUNTRY, "BE");
  const sellerEndpointId = clean(env.BILLIT_SELLER_ENDPOINT_ID);
  const sellerStreet = clean(env.BILLIT_SELLER_STREET);
  const sellerCity = clean(env.BILLIT_SELLER_CITY);
  const sellerPostalCode = clean(env.BILLIT_SELLER_POSTAL_CODE);
  const buyerName = clean(billing.legalName);
  const buyerCountry = clean(billing.countryCode);
  const buyerStreet = clean(billing.addressLine1);
  const buyerStreet2 = clean(billing.addressLine2);
  const buyerCity = clean(billing.city);
  const buyerPostalCode = clean(billing.postalCode);
  const buyerVatCountry = clean(billing.vatCountryCode);
  const rawBuyerVatNumber = clean(billing.vatNumber);

  const normalizedBuyerVatNumber = rawBuyerVatNumber
    .replace(/\s+/g, "")
    .replace(new RegExp(`^${buyerVatCountry}`, "i"), "");

  const buyerVat =
    buyerVatCountry && normalizedBuyerVatNumber
      ? `${buyerVatCountry}${normalizedBuyerVatNumber}`
      : "";
      
  const buyerEndpointId = buyerVat ? `0208:${buyerVat.replace(/\s+/g, "")}` : "";
  const currency = clean(invoice.currency, "EUR");
  const subtotalCents = Number(invoice.subtotal_cents ?? invoice.subtotalCents ?? 0);
  const vatCents = Number(invoice.vat_cents ?? invoice.vatCents ?? 0);
  const totalCents = Number(invoice.total_cents ?? invoice.totalCents ?? 0);
  const subtotal = money(subtotalCents);
  const vat = money(vatCents);
  const total = money(totalCents);
  const vatPercent = toVatPercent(vatCents, subtotalCents);
  const issueDate = isoDate(invoice.issued_at ?? invoice.issuedAt);
  const dueDate = isoDate(invoice.paid_at ?? invoice.paidAt ?? invoice.issued_at ?? invoice.issuedAt);
  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice
  xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">

  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0</cbc:CustomizationID>
  <cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>

  <cbc:ID>${esc(invoice.number)}</cbc:ID>
  <cbc:IssueDate>${issueDate}</cbc:IssueDate>
  <cbc:DueDate>${dueDate}</cbc:DueDate>
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${esc(currency)}</cbc:DocumentCurrencyCode>
  <cbc:BuyerReference>Eventflow Subscription</cbc:BuyerReference>

  <cac:AccountingSupplierParty>
    <cac:Party>
      <cbc:EndpointID schemeID="0208">${esc(sellerEndpointId.replace(/^0208:/, ""))}</cbc:EndpointID>

      <cac:PartyName>
        <cbc:Name>${esc(sellerName)}</cbc:Name>
      </cac:PartyName>

      <cac:PostalAddress>
        <cbc:StreetName>${esc(sellerStreet)}</cbc:StreetName>
        <cbc:CityName>${esc(sellerCity)}</cbc:CityName>
        <cbc:PostalZone>${esc(sellerPostalCode)}</cbc:PostalZone>
        <cac:Country>
          <cbc:IdentificationCode>${esc(sellerCountry)}</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>

      <cac:PartyTaxScheme>
        <cbc:CompanyID>${esc(sellerVat)}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>

      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${esc(sellerName)}</cbc:RegistrationName>
        <cbc:CompanyID>${esc(sellerVat)}</cbc:CompanyID>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>

  <cac:AccountingCustomerParty>
    <cac:Party>
      <cbc:EndpointID schemeID="0208">${esc(buyerEndpointId.replace(/^0208:/, ""))}</cbc:EndpointID>

      <cac:PartyName>
        <cbc:Name>${esc(buyerName)}</cbc:Name>
      </cac:PartyName>

      <cac:PostalAddress>
        <cbc:StreetName>${esc(buyerStreet)}</cbc:StreetName>
        ${buyerStreet2 ? `<cbc:AdditionalStreetName>${esc(buyerStreet2)}</cbc:AdditionalStreetName>` : ""}
        <cbc:CityName>${esc(buyerCity)}</cbc:CityName>
        <cbc:PostalZone>${esc(buyerPostalCode)}</cbc:PostalZone>
        <cac:Country>
          <cbc:IdentificationCode>${esc(buyerCountry)}</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>

      <cac:PartyTaxScheme>
        <cbc:CompanyID>${esc(buyerVat)}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>

      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${esc(buyerName)}</cbc:RegistrationName>
        <cbc:CompanyID>${esc(buyerVat)}</cbc:CompanyID>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingCustomerParty>

  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${esc(currency)}">${vat}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${esc(currency)}">${subtotal}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${esc(currency)}">${vat}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>${esc(vatPercent)}</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>

  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${esc(currency)}">${subtotal}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${esc(currency)}">${subtotal}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${esc(currency)}">${total}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${esc(currency)}">${total}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>

  <cac:InvoiceLine>
    <cbc:ID>1</cbc:ID>
    <cbc:InvoicedQuantity unitCode="C62">1</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${esc(currency)}">${subtotal}</cbc:LineExtensionAmount>

    <cac:Item>
      <cbc:Name>Abonnement Eventflow</cbc:Name>
      <cac:ClassifiedTaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>${esc(vatPercent)}</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
    </cac:Item>

    <cac:Price>
      <cbc:PriceAmount currencyID="${esc(currency)}">${subtotal}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>

</Invoice>`;
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const body = await req.json().catch(() => ({}));
    const { invoice_id, debug = false, dryRun = false } = body;

    if (!invoice_id) {
      return json({
        ok: false,
        error: "invoice_id_required",
      }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      return json({
        ok: false,
        error: "server_misconfigured",
      }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const billitKey = Deno.env.get("BILLIT_API_KEY");
    const billitPartyId = Deno.env.get("BILLIT_PARTY_ID");

    const billitBaseUrl =
      Deno.env.get("BILLIT_BASE_URL") ?? "https://api.billit.be";

    const billitEndpoint = `${billitBaseUrl}/v1/peppol/sendxml`;

    const env = {
      BILLIT_SELLER_NAME: Deno.env.get("BILLIT_SELLER_NAME") ?? "",
      BILLIT_SELLER_VAT: Deno.env.get("BILLIT_SELLER_VAT") ?? "",
      BILLIT_SELLER_COUNTRY: Deno.env.get("BILLIT_SELLER_COUNTRY") ?? "BE",
      BILLIT_SELLER_ENDPOINT_ID: Deno.env.get("BILLIT_SELLER_ENDPOINT_ID") ?? "",
      BILLIT_SELLER_STREET: Deno.env.get("BILLIT_SELLER_STREET") ?? "",
      BILLIT_SELLER_CITY: Deno.env.get("BILLIT_SELLER_CITY") ?? "",
      BILLIT_SELLER_POSTAL_CODE: Deno.env.get("BILLIT_SELLER_POSTAL_CODE") ?? "",
    };

    const { data: invoice, error } = await supabase
          .from("invoices")
          .select(`
            id,
            number,
            currency,
            subtotal_cents,
            vat_cents,
            total_cents,
            issued_at,
            paid_at,
            billing_snapshot,
            pdf_path
          `)
          .eq("id", invoice_id)
          .maybeSingle();

        if (error) {
          console.error("[billit-edge] invoice_query_error", error);

          return json({
            ok: false,
            error: "invoice_query_error",
            details: error,
          }, 500);
        }

        if (!invoice) {
          return json({
            ok: false,
            error: "invoice_not_found",
            invoice_id,
          }, 404);
        }

    const { data: peppolRow, error: peppolError } = await supabase
        .from("invoice_peppol")
        .select("status, attempt_count, error_message, provider_message_id, sent_at")
        .eq("invoice_id", invoice_id)
        .eq("provider", "billit")
        .maybeSingle();

      if (peppolError) {
        console.error("[billit-edge] peppol_query_error", peppolError);

        return json({
          ok: false,
          error: "peppol_query_error",
          details: peppolError,
        }, 500);
      }

      if (peppolRow?.status === "sent" && !debug && !dryRun) {
        return json({
          ok: true,
          reused: true,
          reason: "already_sent",
          providerMessageId: peppolRow.provider_message_id,
          sentAt: peppolRow.sent_at,
        }, 200);
      }

    const billing = invoice.billing_snapshot?.billing ?? {};
    const ublXml = buildUblInvoice(invoice, env);

    if (debug || dryRun) {
      return json({
        ok: true,
        debug: true,
        dryRun: true,
        invoice: {
          id: invoice.id,
          number: invoice.number,
          currency: invoice.currency,
          subtotal_cents: invoice.subtotal_cents,
          vat_cents: invoice.vat_cents,
          total_cents: invoice.total_cents,
          issued_at: invoice.issued_at,
          paid_at: invoice.paid_at,
          pdf_path: invoice.pdf_path,
        },
        peppol: peppolRow,
        billit: {
          endpoint: billitEndpoint,
          baseUrl: billitBaseUrl,
          hasApiKey: Boolean(billitKey),
          hasPartyId: Boolean(billitPartyId),
          partyId: billitPartyId ?? null,
        },
        seller: {
          name: env.BILLIT_SELLER_NAME,
          vat: env.BILLIT_SELLER_VAT,
          country: env.BILLIT_SELLER_COUNTRY,
          endpointId: env.BILLIT_SELLER_ENDPOINT_ID,
          street: env.BILLIT_SELLER_STREET,
          city: env.BILLIT_SELLER_CITY,
          postalCode: env.BILLIT_SELLER_POSTAL_CODE,
        },
        buyer: billing,
        buyerPeppolDataOk: hasBuyerPeppolData(billing),
        ublPreview: safeStr(ublXml, 4000),
      }, 200);
    }

    await supabase.rpc("rpc_update_invoice_peppol_status", {
      p_input: {
        invoice_id,
        status: "sending",
        error_message: null,
      },
    });

    if (!billitKey || !billitPartyId) {
      await supabase.rpc("rpc_update_invoice_peppol_status", {
        p_input: {
          invoice_id,
          status: "skipped",
          error_message:
            "Billit not configured (missing BILLIT_API_KEY or BILLIT_PARTY_ID)",
        },
      });

      return json({
        ok: true,
        skipped: true,
        reason: "billit_not_configured",
      }, 200);
    }

    if (!hasBuyerPeppolData(billing)) {
      await supabase.rpc("rpc_update_invoice_peppol_status", {
        p_input: {
          invoice_id,
          status: "skipped",
          error_message:
            "Peppol not applicable (missing buyer legal/VAT/address data)",
        },
      });

      return json({
        ok: true,
        skipped: true,
        reason: "missing_buyer_peppol_data",
      }, 200);
    }

    if (!invoice.pdf_path) {
      supabase.functions
        .invoke("generate-invoice-pdf", {
          body: { invoice_id },
        })
        .catch((e) =>
          console.error("[billit-edge] generate pdf call failed", e)
        );
    }

    console.error("[billit-edge] sending to Billit", {
      endpoint: billitEndpoint,
      invoice_id,
      invoiceNumber: invoice.number,
      hasApiKey: Boolean(billitKey),
      hasPartyId: Boolean(billitPartyId),
      partyId: billitPartyId,
    });

    const res = await fetch(billitEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ApiKey: billitKey,
        PartyID: billitPartyId,
      },
      body: JSON.stringify({
        XML: ublXml,
      }),
    });

    const text = await res.text().catch(() => "");

    console.error("[billit-edge] Billit raw response", {
      status: res.status,
      statusText: res.statusText,
      body: text,
    });

    if (!res.ok) {

  const isCustomerNotPeppol =
    text.includes("TheCustomerDoesNotSupportPeppolForType");

  if (isCustomerNotPeppol) {
    await supabase.rpc("rpc_update_invoice_peppol_status", {
      p_input: {
        invoice_id,
        status: "skipped",
        error_message: safeStr(text, 500),
      },
    });

    return json({
      ok: true,
      skipped: true,
      reason: "customer_does_not_support_peppol_invoice",
      billitStatus: res.status,
      body: safeStr(text, 1000),
    }, 200);
  }

  await supabase.rpc("rpc_update_invoice_peppol_status", {
    p_input: {
      invoice_id,
      status: "failed",
      error_message: safeStr(text || `HTTP ${res.status}`, 500),
    },
  });

  return json({
    ok: false,
    error: "billit_send_failed",
    status: res.status,
    statusText: res.statusText,
    body: safeStr(text, 1000),
  }, 502);
}

    let payload = {};
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      payload = { raw: text };
    }

    await supabase.rpc("rpc_update_invoice_peppol_status", {
      p_input: {
        invoice_id,
        status: "sent",
        provider_message_id:
          payload?.message_id ?? payload?.messageId ?? payload?.id ?? null,
        error_message: null,
      },
    });

    return json({
      ok: true,
      messageId: payload?.message_id ?? payload?.messageId ?? payload?.id ?? null,
      payload,
    }, 200);
  } catch (e) {
    console.error("[billit-edge] unexpected", e);

    return json({
      ok: false,
      error: "unexpected",
      message: String(e?.message ?? e),
    }, 500);
  }
});