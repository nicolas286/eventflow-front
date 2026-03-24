// supabase/functions/send-confirmation-mail/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generateTicketsPdf } from "./ticketsPdf.ts";
import { buildOrderConfirmationHtml } from "./mailTemplate.ts";
/* ---------------- JSON helpers ---------------- */ function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}
function bad(msg, status = 400) {
  return json({
    ok: false,
    error: msg
  }, status);
}
/* ---------------- utils ---------------- */ function envTrim(name) {
  const v = Deno.env.get(name);
  const t = typeof v === "string" ? v.trim() : "";
  return t ? t : null;
}
function looksLikeEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}
function isValidUuid(v) {
  if (typeof v !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}
function compactAnswerValue(v) {
  if (v == null) return null;
  // cas simple : string JSONB brute
  if (typeof v === "string") {
    const s = v.trim();
    return s || null;
  }
  // cas simple : nombre / bool JSONB brut
  if (typeof v === "number") {
    return String(v);
  }
  if (typeof v === "boolean") {
    return v ? "Oui" : "Non";
  }
  // cas objet structuré
  if (typeof v === "object") {
    const text = v.value_text ?? v.value_date ?? (typeof v.value_int === "number" ? String(v.value_int) : null) ?? (typeof v.value_bool === "boolean" ? v.value_bool ? "Oui" : "Non" : null);
    const s = String(text ?? "").trim();
    return s || null;
  }
  return null;
}
async function sendMail(payload) {
  const url = envTrim("MAIL_SERVICE_URL");
  const token = envTrim("MAIL_SERVICE_TOKEN");
  if (!url) throw new Error("MAIL_SERVICE_URL missing");
  if (!token) throw new Error("MAIL_SERVICE_TOKEN missing");
  const ctrl = new AbortController();
  const t = setTimeout(()=>ctrl.abort(), 10_000);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      "x-service-token": token
    },
    body: JSON.stringify(payload),
    signal: ctrl.signal
  }).finally(()=>clearTimeout(t));
  const text = await res.text().catch(()=>"");
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch  {
    data = {
      raw: text.slice(0, 300)
    };
  }
  if (!res.ok || !data?.ok) {
    console.error("mail-service failed", {
      status: res.status,
      data,
      url
    });
    throw new Error("MAIL_SERVICE_FAILED");
  }
}
/* ---------------- edge ---------------- */ Deno.serve(async (req)=>{
  if (req.method !== "POST") return bad("Method not allowed", 405);
  const expected = envTrim("EDGE_SERVICE_TOKEN");
  const received = envTrimHeader(req, "x-service-token");
  if (!expected) return bad("EDGE_SERVICE_TOKEN missing", 500);
  if (!received || received !== expected) return bad("Unauthorized", 401);
  let body;
  try {
    body = await req.json();
  } catch  {
    return bad("Invalid JSON body");
  }
  try {
    // ✅ TEMPLATE CENTRALISÉ
    if (body?.templateId === "order_confirmation_v1") {
      const orderId = String(body?.templateData?.orderId ?? "").trim();
      if (!isValidUuid(orderId)) return bad("Invalid orderId");
      const supabaseUrl = envTrim("SUPABASE_URL");
      const serviceKey = envTrim("SUPABASE_SERVICE_ROLE_KEY");
      const appBaseUrl = envTrim("APP_BASE_URL");
      if (!supabaseUrl || !serviceKey) return bad("Supabase env missing", 500);
      if (!appBaseUrl) return bad("APP_BASE_URL missing", 500);
      const admin = createClient(supabaseUrl, serviceKey);
      // 1) order
      const { data: o, error: oErr } = await admin.from("orders").select("id, event_id, currency, total_cents, paid_cents, buyer_email, booking_token").eq("id", orderId).maybeSingle();
      if (oErr || !o?.id) return bad("Order not found", 404);
      const to = String(o.buyer_email ?? "").trim();
      if (!looksLikeEmail(to)) return bad("Order buyer_email invalid", 400);
      const bookingToken = String(o.booking_token ?? "").trim();
      if (!bookingToken) return bad("Order booking_token missing", 500);
      const currency = String(o.currency ?? "EUR").trim() || "EUR";
      const totalCents = Number(o.total_cents ?? 0) || 0;
      const paidCents = Number(o.paid_cents ?? 0) || 0;
      // 2) event
      let eventTitle = "Votre événement";
      let startsAt = null;
      let location = null;
      let description = null;
      if (o.event_id) {
        const { data: ev } = await admin.from("events").select("title, description, starts_at, location").eq("id", String(o.event_id)).maybeSingle();
        if (ev?.title) eventTitle = String(ev.title);
        startsAt = ev?.starts_at ? String(ev.starts_at) : null;
        location = ev?.location ? String(ev.location) : null;
        description = ev?.description ? String(ev.description) : null;
      }
      // 3) items (snapshots)
      const { data: rows, error: itErr } = await admin.from("order_items").select("product_name_snapshot, unit_price_cents_snapshot, quantity").eq("order_id", orderId).order("created_at", {
        ascending: true
      });
      if (itErr) console.error("[send-confirmation-mail] load order_items failed", itErr);
      const items = (rows ?? []).map((r)=>{
        const name = String(r?.product_name_snapshot ?? "").trim() || "Billet";
        const qty = Number(r?.quantity ?? 0);
        const unitCents = Number(r?.unit_price_cents_snapshot ?? 0);
        if (!Number.isFinite(qty) || qty <= 0) return null;
        if (!Number.isFinite(unitCents) || unitCents < 0) return null;
        return {
          name,
          qty,
          unitCents,
          lineCents: unitCents * qty
        };
      }).filter(Boolean);
      const orderUrl = `${appBaseUrl}/order/${orderId}?token=${encodeURIComponent(bookingToken)}`;
      // 4) Tickets
      let ticketRows = null;
      let tkErr = null;
      for(let attempt = 0; attempt < 4; attempt++){
        const res = await admin.from("tickets").select("id, ticket_index, qr_token, admits_count, status, order_item_id, product_id").eq("order_id", orderId).order("created_at", {
          ascending: true
        });
        ticketRows = res.data;
        tkErr = res.error;
        if (tkErr) {
          console.error("[send-confirmation-mail-test-tickets] load tickets failed", tkErr);
          break;
        }
        if (ticketRows && ticketRows.length > 0) {
          break;
        }
        await new Promise((r)=>setTimeout(r, 300));
      }
      if (tkErr) {
        return json({
          ok: false,
          error: "TICKETS_LOAD_FAILED"
        }, 502);
      }
      console.log("[send-confirmation-mail-test-tickets] tickets fetched", {
        orderId,
        count: ticketRows?.length ?? 0
      });
      const { data: orderItemRows } = await admin.from("order_items").select("id, product_id, product_name_snapshot, unit_price_cents_snapshot").eq("order_id", orderId);
      const orderItemMetaById = new Map();
      for (const r of orderItemRows ?? []){
        orderItemMetaById.set(String(r.id), {
          product_id: String(r.product_id),
          product_name_snapshot: String(r.product_name_snapshot ?? "Billet"),
          unit_price_cents_snapshot: Number(r.unit_price_cents_snapshot ?? 0)
        });
      }
      const productIds = Array.from(new Set((ticketRows ?? []).map((r)=>String(r.product_id)).filter(Boolean)));
      const createsAttendeesByProductId = new Map();
      if (productIds.length > 0) {
        const { data: productRows } = await admin.from("event_products").select("id, creates_attendees").in("id", productIds);
        for (const r of productRows ?? []){
          createsAttendeesByProductId.set(String(r.id), Boolean(r.creates_attendees));
        }
      }
      const { data: attendeeRows, error: attendeeErr } = await admin.from("order_attendees").select("id, product_id, attendee_index").eq("order_id", orderId).order("attendee_index", {
        ascending: true
      });
      if (attendeeErr) {
        console.error("[send-confirmation-mail-test-tickets] load order_attendees failed", attendeeErr);
      }
      const attendeeIds = (attendeeRows ?? []).map((r)=>String(r.id));
      const answersByAttendeeId = new Map();
      if (attendeeIds.length > 0) {
        const { data: answerRows, error: ansErr } = await admin.from("order_attendee_answers").select("attendee_id, field_label_snapshot, field_key_snapshot, value, created_at").in("attendee_id", attendeeIds).order("created_at", {
          ascending: true
        });
        if (ansErr) {
          console.error("[send-confirmation-mail-test-tickets] load attendee answers failed", ansErr);
        } else {
          for (const row of answerRows ?? []){
            const attendeeId = String(row.attendee_id);
            const key = String(row.field_key_snapshot ?? "").trim();
            const label = String(row.field_label_snapshot ?? "").trim() || key || "Champ";
            const val = compactAnswerValue(row.value);
            if (!val) continue;
            const arr = answersByAttendeeId.get(attendeeId) ?? [];
            arr.push({
              key,
              label,
              value: val
            });
            answersByAttendeeId.set(attendeeId, arr);
          }
        }
      }
      const attendeeIdsByProductId = new Map();
      for (const row of attendeeRows ?? []){
        const productId = String(row.product_id);
        const attendeeId = String(row.id);
        const arr = attendeeIdsByProductId.get(productId) ?? [];
        arr.push(attendeeId);
        attendeeIdsByProductId.set(productId, arr);
      }
      const rawTickets = (ticketRows ?? []).map((r)=>{
        const orderItemId = String(r.order_item_id);
        const productId = String(r.product_id);
        const meta = orderItemMetaById.get(orderItemId);
        const createsAttendees = createsAttendeesByProductId.get(productId) ?? false;
        const admitsCount = Number(r.admits_count ?? 1);
        const ticketIndex = Number(r.ticket_index ?? 0);
        let attendee_summary_lines = [];
        if (createsAttendees) {
          const attendeeIdsForProduct = attendeeIdsByProductId.get(productId) ?? [];
          const start = Math.max(0, (ticketIndex - 1) * Math.max(1, admitsCount));
          const end = start + Math.max(1, admitsCount);
          const slice = attendeeIdsForProduct.slice(start, end);
          attendee_summary_lines = slice.flatMap((attendeeId)=>{
            const answers = answersByAttendeeId.get(attendeeId) ?? [];
            const prioritized = [
              ...answers.filter((a)=>a.key === "first_name"),
              ...answers.filter((a)=>a.key === "last_name"),
              ...answers.filter((a)=>a.key === "email"),
              ...answers.filter((a)=>![
                  "first_name",
                  "last_name",
                  "email"
                ].includes(a.key))
            ];
            return prioritized.slice(0, 2).map((a)=>`${a.label} : ${a.value}`);
          }).slice(0, 2);
        }
        return {
          id: String(r.id),
          ticket_index: ticketIndex,
          qr_token: String(r.qr_token ?? ""),
          admits_count: admitsCount,
          status: String(r.status ?? "valid"),
          product_id: productId,
          order_item_id: orderItemId,
          product_name_snapshot: meta?.product_name_snapshot ?? "Billet",
          unit_price_cents: Number(meta?.unit_price_cents_snapshot ?? 0),
          creates_attendees: createsAttendees,
          attendee_summary_lines
        };
      });
      // Billets "nominatifs / avec participants" d'abord, les autres à la fin
      const tickets = rawTickets.sort((a, b)=>{
        if (a.creates_attendees !== b.creates_attendees) {
          return a.creates_attendees ? -1 : 1;
        }
        return a.ticket_index - b.ticket_index;
      });
      const subject = String(body?.subject ?? "").trim() || `Inscription confirmée – ${eventTitle}`;
      const html = buildOrderConfirmationHtml({
        eventTitle,
        startsAt,
        location,
        description,
        orderUrl,
        currency,
        items,
        totalCents,
        paidCents
      });
      // ✅ idempotence: log une seule fois le mail de confirmation
      const { data: canSend, error: logErr } = await admin.rpc("log_email_once", {
        p_order_id: orderId,
        p_kind: "confirmation_v1"
      });
      if (logErr) {
        console.error("[send-confirmation-mail] log_email_once failed", logErr);
        // on évite d’envoyer si on ne sait pas logger (sinon doublons)
        return json({
          ok: false,
          error: "LOG_FAILED"
        }, 502);
      }
      if (!canSend) {
        // déjà envoyé -> on répond ok pour être “safe” en retry
        return json({
          ok: true,
          skipped: "already_sent"
        });
      }
      const pdfAttachment = tickets.length > 0 ? await generateTicketsPdf({
        orderId,
        eventTitle,
        startsAt,
        location,
        currency,
        tickets
      }) : null;
      await sendMail({
        to,
        subject,
        content: html,
        isHtml: true,
        attachments: pdfAttachment ? [
          pdfAttachment
        ] : []
      });
      return json({
        ok: true,
        sent: true,
        ticketsCount: tickets.length,
        pdfAttached: Boolean(pdfAttachment)
      });
    }
    // ✅ LEGACY / CUSTOM CONTENT (backward compatible)
    const to = String(body?.to ?? "").trim();
    const subject = String(body?.subject ?? "").trim();
    const isHtml = body?.isHtml ?? true;
    if (!looksLikeEmail(to)) return bad("Invalid recipient email");
    if (!subject) return bad("Missing subject");
    const content = String(body?.content ?? "").trim();
    if (!content) return bad("Missing content or templateId");
    await sendMail({
      to,
      subject,
      content,
      isHtml
    });
    return json({
      ok: true
    });
  } catch (err) {
    console.error("send-confirmation-mail error:", err);
    return json({
      ok: false,
      error: "SEND_FAILED"
    }, 502);
  }
});
function envTrimHeader(req, name) {
  const v = req.headers.get(name) ?? "";
  const t = v.trim();
  return t ? t : null;
}
