// supabase/functions/generate-invoice-pdf/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400"
};
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}
function getBearer(req) {
  const h = req.headers.get("authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1] ?? null;
}
function isUuid(v) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}
function moneyFromCents(cents, currency = "EUR") {
  const v = (Number.isFinite(cents) ? cents : 0) / 100;
  const s = v.toFixed(2);
  return currency === "EUR" ? `${s} €` : `${s} ${currency}`;
}
function isoDate(d) {
  if (!d) return "";
  const t = Date.parse(d);
  if (Number.isNaN(t)) return "";
  const dt = new Date(t);
  const yyyy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
async function buildPdfBytes(invoice) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([
    595.28,
    841.89
  ]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();
  const margin = 48;
  // ---------------------------
  // Seller (toi)
  // ---------------------------
  const sellerLines = [
    "EventFlow",
    "Rue Feral 43",
    "5190 Ham sur Sambre (Belgique)",
    "TVA BE0840.386.125"
  ];
  // Mention TVA (franchise)
  const vatExemptionLine = "Regime particulier de franchise des petites entreprises - TVA non applicable";
  // ---------------------------
  // Buyer (client)
  // ---------------------------
  const billing = invoice?.billing_snapshot?.billing ?? invoice?.billing_snapshot?.billingProfile ?? null;
  const legalName = billing?.legalName ?? "-";
  const vat = [
    billing?.vatCountryCode,
    billing?.vatNumber
  ].filter(Boolean).join(" ") || "-";
  const addr1 = billing?.addressLine1 ?? "";
  const addr2 = billing?.addressLine2 ?? "";
  const city = [
    billing?.postalCode,
    billing?.city
  ].filter(Boolean).join(" ");
  const country = billing?.countryCode ?? "";
  const email = billing?.billingEmail ?? "";
  const ref = billing?.invoiceReference ?? "";
  const number = invoice?.number ?? "-";
  const issuedAt = isoDate(invoice?.issued_at ?? null);
  const paidAt = isoDate(invoice?.paid_at ?? null);
  const periodStart = isoDate(invoice?.period_start ?? null);
  const periodEnd = isoDate(invoice?.period_end ?? null);
  const currency = invoice?.currency ?? "EUR";
  const subtotal = Number(invoice?.subtotal_cents ?? 0);
  const vatCents = Number(invoice?.vat_cents ?? 0);
  const total = Number(invoice?.total_cents ?? 0);
  // ---------------------------
  // Layout
  // ---------------------------
  let yLeft = height - margin;
  // Big title
  page.drawText("FACTURE", {
    x: margin,
    y: yLeft,
    size: 30,
    font: fontBold
  });
  yLeft -= 40;
  // Seller block (left)
  page.drawText("Emetteur", {
    x: margin,
    y: yLeft,
    size: 12,
    font: fontBold
  });
  yLeft -= 16;
  for (const line of sellerLines){
    page.drawText(line, {
      x: margin,
      y: yLeft,
      size: 10,
      font
    });
    yLeft -= 13;
  }
  // Invoice meta (left)
  yLeft -= 10;
  page.drawText(`N° E-${number}`, {
    x: margin,
    y: yLeft,
    size: 12,
    font: fontBold
  });
  yLeft -= 18;
  page.drawText(`Emise le : ${issuedAt || "-"}`, {
    x: margin,
    y: yLeft,
    size: 10,
    font
  });
  yLeft -= 14;
  page.drawText(`Payee le : ${paidAt || "-"}`, {
    x: margin,
    y: yLeft,
    size: 10,
    font
  });
  yLeft -= 14;
  page.drawText(`Periode : ${periodStart || "-"} - ${periodEnd || "-"}`, {
    x: margin,
    y: yLeft,
    size: 10,
    font
  });
  yLeft -= 18;
  // Customer block (right)
  const bx = width / 2 + 20;
  let yRight = height - margin - 40;
  page.drawText("Client", {
    x: bx,
    y: yRight,
    size: 12,
    font: fontBold
  });
  yRight -= 16;
  const buyerLines = [
    String(legalName || "-"),
    vat !== "-" ? `TVA : ${vat}` : "",
    addr1,
    addr2,
    [
      city,
      country
    ].filter(Boolean).join(" ").trim(),
    email ? `Email : ${email}` : "",
    ref ? `Ref : ${ref}` : ""
  ].filter((l)=>String(l).trim().length > 0);
  for (const line of buyerLines){
    page.drawText(line, {
      x: bx,
      y: yRight,
      size: 10,
      font
    });
    yRight -= 13;
  }
  // ---- Table starts BELOW both blocks
  let y = Math.min(yLeft, yRight) - 28;
  const col1 = margin;
  const col2 = width - margin - 160;
  page.drawText("Description", {
    x: col1,
    y,
    size: 10,
    font: fontBold
  });
  page.drawText("Montant", {
    x: col2,
    y,
    size: 10,
    font: fontBold
  });
  y -= 16;
  page.drawText("Abonnement EventFlow", {
    x: col1,
    y,
    size: 10,
    font
  });
  page.drawText(moneyFromCents(total, currency), {
    x: col2,
    y,
    size: 10,
    font
  });
  y -= 28;
  // Totals (right)
  const tx = width - margin - 200;
  page.drawText(`Sous-total : ${moneyFromCents(subtotal, currency)}`, {
    x: tx,
    y,
    size: 10,
    font
  });
  y -= 14;
  page.drawText(`TVA : ${moneyFromCents(vatCents, currency)}`, {
    x: tx,
    y,
    size: 10,
    font
  });
  y -= 16;
  page.drawText(`Total : ${moneyFromCents(total, currency)}`, {
    x: tx,
    y,
    size: 12,
    font: fontBold
  });
  // Footer: VAT exemption + generated
  page.drawText(vatExemptionLine, {
    x: margin,
    y: margin + 10,
    size: 9,
    font
  });
  page.drawText("Document genere automatiquement.", {
    x: margin,
    y: margin - 5,
    size: 9,
    font
  });
  return await pdf.save();
}
Deno.serve(async (req)=>{
  try {
    if (req.method === "OPTIONS") return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
    if (req.method !== "POST") return json({
      error: "Method not allowed"
    }, 405);
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) return json({
      error: "Server misconfigured"
    }, 500);
    // edge-only guard: require Bearer service role
    const bearer = getBearer(req);
    if (!bearer || bearer !== serviceKey) return json({
      error: "FORBIDDEN"
    }, 403);
    const body = await req.json().catch(()=>null);
    const invoiceId = String(body?.invoice_id ?? "").trim();
    const force = Boolean(body?.force ?? false);
    if (!invoiceId || !isUuid(invoiceId)) {
      return json({
        error: "VALIDATION_ERROR: invoice_id invalid"
      }, 400);
    }
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: inv, error: invErr } = await admin.from("invoices").select("id, org_id, number, currency, subtotal_cents, vat_cents, total_cents, issued_at, paid_at, period_start, period_end, billing_snapshot, pdf_path").eq("id", invoiceId).maybeSingle();
    if (invErr) return json({
      error: "DB_ERROR",
      details: String(invErr.message ?? invErr)
    }, 500);
    if (!inv?.id) return json({
      error: "NOT_FOUND"
    }, 404);
    if (!inv.org_id || !inv.number) {
      return json({
        error: "VALIDATION_ERROR: invoice missing org_id/number"
      }, 400);
    }
    // Build storage path
    const year = String(inv.number).slice(0, 4);
    const safeYear = /^\d{4}$/.test(year) ? year : String(new Date().getUTCFullYear());
    // client path (comme avant)
    const clientPath = `${inv.org_id}/${safeYear}/${inv.number}.pdf`;
    const accountingPath = `accounting/${safeYear}/${inv.number}.pdf`;
    // Generate PDF
    let pdfBytes;
    try {
      pdfBytes = await buildPdfBytes(inv);
    } catch (e) {
      return json({
        error: "PDF_BUILD_FAILED",
        details: String(e?.message ?? e)
      }, 500);
    }
    // Upload options
    const uploadOpts = {
      contentType: "application/pdf",
      upsert: force
    };
    // 1) Upload client
    const upClient = await admin.storage.from("invoices").upload(clientPath, pdfBytes, uploadOpts);
    if (upClient.error && !force) {
      const msg = String(upClient.error.message ?? upClient.error);
      const isAlreadyExists = msg.toLowerCase().includes("already exists") || msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("exists");
      if (!isAlreadyExists) {
        return json({
          error: "UPLOAD_FAILED_CLIENT",
          details: msg
        }, 500);
      }
    }
    // 2) Upload perso
    const upAccounting = await admin.storage.from("invoices").upload(accountingPath, pdfBytes, uploadOpts);
    if (upAccounting.error && !force) {
      const msg = String(upAccounting.error.message ?? upAccounting.error);
      const isAlreadyExists = msg.toLowerCase().includes("already exists") || msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("exists");
      if (!isAlreadyExists) {
        return json({
          error: "UPLOAD_FAILED_PERSO",
          details: msg
        }, 500);
      }
    }
    // Persist pdf_path only if missing or force
    if (!inv.pdf_path || force) {
      const { error: setErr } = await admin.rpc("rpc_set_invoice_pdf_path", {
        p_invoice_id: inv.id,
        p_pdf_path: clientPath
      });
      if (setErr) {
        return json({
          error: "SET_PDF_PATH_FAILED",
          details: String(setErr.message ?? setErr)
        }, 500);
      }
    }
    return json({
      ok: true,
      invoice_id: inv.id,
      pdf_path: clientPath
    }, 200);
  } catch (e) {
    console.error("[generate-invoice-pdf] unexpected", e);
    return json({
      error: "UNEXPECTED"
    }, 500);
  }
});
