// supabase/functions/send-reminder-mail/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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
function envTrimHeader(req, name) {
  const v = req.headers.get(name) ?? "";
  const t = v.trim();
  return t ? t : null;
}
function looksLikeEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}
function isValidUuid(v) {
  if (typeof v !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}
function escapeHtml(s) {
  return String(s ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
function truncate(s, max = 700) {
  const t = String(s ?? "").trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1).trimEnd() + "…";
}
function formatBrussels(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso;
  return new Intl.DateTimeFormat("fr-BE", {
    timeZone: "Europe/Brussels",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(d);
}
/**
 * Retourne YYYY-MM-DD en Europe/Brussels (comparaison “jour civil”)
 */ function brusselsDateKey(d) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Brussels",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(d); // YYYY-MM-DD
}
function toInt(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}
function formatMoney(cents, currency) {
  const n = Number(cents ?? 0) / 100;
  try {
    return new Intl.NumberFormat("fr-BE", {
      style: "currency",
      currency
    }).format(n);
  } catch  {
    return `${n.toFixed(2)} ${currency}`;
  }
}
/* ---------------- mail service call ---------------- */ async function sendMail(payload) {
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
function buildOrderReminderHtml(p) {
  const title = escapeHtml(p.eventTitle);
  const when = formatBrussels(p.startsAt ?? null);
  const location = String(p.location ?? "").trim();
  const desc = truncate(String(p.description ?? ""), 900);
  const days = Math.max(0, toInt(p.reminderDays, 0));
  const total = Math.max(0, Number(p.totalCents ?? 0));
  const paid = Math.max(0, Number(p.paidCents ?? 0));
  const due = Math.max(0, total - paid);
  const itemsRows = (p.items ?? []).filter((x)=>x.qty > 0).map((x)=>{
    return `
        <tr>
          <td style="padding:10px 12px;border-top:1px solid #eee;">
            <div style="font-weight:700">${escapeHtml(x.name)}</div>
          </td>
          <td style="padding:10px 12px;border-top:1px solid #eee;text-align:center;white-space:nowrap;">
            ${x.qty}
          </td>
          <td style="padding:10px 12px;border-top:1px solid #eee;text-align:right;white-space:nowrap;">
            ${escapeHtml(formatMoney(x.unitCents, p.currency))}
          </td>
          <td style="padding:10px 12px;border-top:1px solid #eee;text-align:right;white-space:nowrap;font-weight:700;">
            ${escapeHtml(formatMoney(x.lineCents, p.currency))}
          </td>
        </tr>
      `;
  }).join("");
  const itemsTable = (p.items?.length ?? 0) > 0 ? `
      <div style="margin:14px 0 6px;font-weight:800">Votre réservation</div>

      <div style="border:1px solid #eee;border-radius:14px;overflow:hidden;background:#fff">
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <thead>
            <tr style="background:#f6f6f7">
              <th style="padding:10px 12px;text-align:left;">Type</th>
              <th style="padding:10px 12px;text-align:center;">Qté</th>
              <th style="padding:10px 12px;text-align:right;">Prix</th>
              <th style="padding:10px 12px;text-align:right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows || `
              <tr><td colspan="4" style="padding:12px;color:#666">Aucun billet trouvé.</td></tr>
            `}
          </tbody>
        </table>
      </div>

      <div style="margin-top:10px;text-align:right;font-size:14px">
        <div style="margin:4px 0"><span style="opacity:.75">Total :</span> <strong>${escapeHtml(formatMoney(total, p.currency))}</strong></div>
        <div style="margin:4px 0"><span style="opacity:.75">Payé :</span> <strong>${escapeHtml(formatMoney(paid, p.currency))}</strong></div>
        ${due > 0 ? `<div style="margin:4px 0"><span style="opacity:.75">Reste à payer :</span> <strong>${escapeHtml(formatMoney(due, p.currency))}</strong></div>` : ``}
      </div>
    ` : `
      <div style="margin:14px 0 6px;font-weight:800">Votre réservation</div>
      <div style="padding:12px 14px;border:1px solid #eee;border-radius:14px;background:#fff;color:#444;font-size:14px">
        Aucun billet trouvé.
      </div>
    `;
  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;line-height:1.6;color:#111;background:#fafafa;padding:24px">
    <div style="max-width:680px;margin:0 auto">
      <div style="background:#fff;border:1px solid #eee;border-radius:16px;padding:20px">
        <div style="font-size:18px;font-weight:900;margin:0 0 10px">⏰ Rappel d’événement</div>
        <div style="margin:0 0 14px;color:#333">
          Petit rappel : l’événement arrive dans <strong>${days} jour${days > 1 ? "s" : ""}</strong>.
        </div>

        <div style="background:#f6f6f7;border-radius:14px;padding:14px 16px;margin:0 0 14px">
          <div style="font-weight:900;font-size:16px;margin:0 0 6px">${title}</div>

          ${when ? `
            <div style="margin:6px 0;font-size:13px;opacity:.85">
              <span style="font-weight:800">🗓️ Date</span> : ${escapeHtml(when)}
            </div>` : ``}

          ${location ? `
            <div style="margin:6px 0;font-size:13px;opacity:.85">
              <span style="font-weight:800">📍 Lieu</span> : ${escapeHtml(location)}
            </div>` : ``}
        </div>

        ${itemsTable}

        ${desc ? `
          <div style="margin:16px 0 8px;font-weight:900">Détails</div>
          <div style="white-space:pre-wrap;font-size:14px;color:#333;opacity:.95">
            ${escapeHtml(desc)}
          </div>` : ``}
      </div>

      <div style="text-align:center;font-size:11px;opacity:.55;margin-top:12px">
        Eventflow
      </div>
    </div>
  </div>`;
}
/* ---------------- business logic ---------------- */ function shouldSendToday(startsAtIso, reminderDays) {
  const starts = new Date(startsAtIso);
  if (!Number.isFinite(starts.getTime())) return false;
  const days = toInt(reminderDays, 0);
  if (days < 0) return false;
  const target = new Date(starts);
  target.setUTCDate(target.getUTCDate() - days);
  const todayKey = brusselsDateKey(new Date());
  const targetKey = brusselsDateKey(target);
  return todayKey === targetKey;
}
/* ---------------- edge ---------------- */ Deno.serve(async (req)=>{
  if (req.method !== "POST") return bad("Method not allowed", 405);
  const expected = envTrim("EDGE_SERVICE_TOKEN");
  const received = envTrimHeader(req, "x-service-token");
  if (!expected) return bad("EDGE_SERVICE_TOKEN missing", 500);
  if (!received || received !== expected) return bad("Unauthorized", 401);
  const supabaseUrl = envTrim("SUPABASE_URL");
  const serviceKey = envTrim("SUPABASE_SERVICE_ROLE_KEY");
  const appBaseUrl = envTrim("APP_BASE_URL");
  if (!supabaseUrl || !serviceKey) return bad("Supabase env missing", 500);
  if (!appBaseUrl) return bad("APP_BASE_URL missing", 500);
  const admin = createClient(supabaseUrl, serviceKey);
  let body = {
    mode: "cron"
  };
  try {
    const txt = await req.text();
    if (txt?.trim()) body = JSON.parse(txt);
  } catch  {
    body = {
      mode: "cron"
    };
  }
  try {
    // ---------------- mode manuel (test) ----------------
    if (body?.mode === "manual") {
      const orderId = String(body?.orderId ?? "").trim();
      if (!isValidUuid(orderId)) return bad("Invalid orderId");
      const res = await processOneOrder(admin, appBaseUrl, orderId, true);
      return json({
        ok: true,
        mode: "manual",
        ...res
      });
    }
    // ---------------- mode cron ----------------
    const limit = 250;
    const horizonDays = 60;
    const now = new Date();
    const max = new Date(now);
    max.setUTCDate(max.getUTCDate() + horizonDays);
    // 1) orders + event (pas de join org_profile ici)
    const { data: orders, error } = await admin.from("orders").select(`
        id,
        buyer_email,
        booking_token,
        status,
        event_id,
        currency,
        total_cents,
        paid_cents,
        events:events (
          id,
          org_id,
          title,
          description,
          starts_at,
          location
        )
      `).in("status", [
      "created",
      "pending",
      "paid",
      "confirmed"
    ]) // adapte si besoin
    .not("event_id", "is", null).limit(limit);
    if (error) {
      console.error("[send-reminder-mail] load orders failed", error);
      return json({
        ok: false,
        error: "LOAD_FAILED"
      }, 502);
    }
    // 2) org profiles bulk
    const orgIds = Array.from(new Set((orders ?? []).map((o)=>o?.events?.org_id).filter(Boolean).map((x)=>String(x))));
    const { data: orgProfiles, error: opErr } = await admin.from("organization_profile").select("org_id, email_reminder_days_before").in("org_id", orgIds);
    if (opErr) {
      console.error("[send-reminder-mail] load organization_profile failed", opErr);
      return json({
        ok: false,
        error: "LOAD_ORG_PROFILE_FAILED"
      }, 502);
    }
    const reminderByOrgId = new Map();
    for (const r of orgProfiles ?? []){
      reminderByOrgId.set(String(r.org_id), Number(r.email_reminder_days_before ?? 0));
    }
    let scanned = 0;
    let eligible = 0;
    let sent = 0;
    let skippedAlreadySent = 0;
    let skippedInvalid = 0;
    let skippedNoReminder = 0;
    for (const o of orders ?? []){
      scanned++;
      const orderId = String(o?.id ?? "");
      const buyerEmail = String(o?.buyer_email ?? "").trim();
      const bookingToken = String(o?.booking_token ?? "").trim();
      const ev = o?.events;
      const startsAt = ev?.starts_at ? String(ev.starts_at) : null;
      const orgId = String(ev?.org_id ?? "");
      const reminderDays = reminderByOrgId.get(orgId) ?? 0;
      if (!orderId || !looksLikeEmail(buyerEmail) || !bookingToken || !startsAt) {
        skippedInvalid++;
        continue;
      }
      if (reminderDays <= 0) {
        skippedNoReminder++;
        continue;
      }
      const starts = new Date(startsAt);
      if (!Number.isFinite(starts.getTime())) {
        skippedInvalid++;
        continue;
      }
      if (starts.getTime() < now.getTime() - 6 * 60 * 60 * 1000) continue;
      if (starts.getTime() > max.getTime()) continue;
      if (!shouldSendToday(startsAt, reminderDays)) continue;
      eligible++;
      const currency = String(o?.currency ?? "EUR").trim() || "EUR";
      const totalCents = Number(o?.total_cents ?? 0) || 0;
      const paidCents = Number(o?.paid_cents ?? 0) || 0;
      const result = await processOneOrder(admin, appBaseUrl, orderId, false, {
        buyerEmail,
        bookingToken,
        eventTitle: String(ev?.title ?? "Votre événement"),
        startsAt,
        location: ev?.location ? String(ev.location) : null,
        description: ev?.description ? String(ev.description) : null,
        reminderDays,
        currency,
        totalCents,
        paidCents
      });
      if (result.status === "sent") sent++;
      else if (result.status === "already_sent") skippedAlreadySent++;
      else skippedInvalid++;
    }
    return json({
      ok: true,
      mode: "cron",
      scanned,
      eligible,
      sent,
      skippedAlreadySent,
      skippedNoReminder,
      skippedInvalid
    });
  } catch (err) {
    console.error("send-reminder-mail error:", err);
    return json({
      ok: false,
      error: "SEND_FAILED"
    }, 502);
  }
});
async function loadOrderItems(admin, orderId) {
  const { data: rows, error } = await admin.from("order_items").select("product_name_snapshot, unit_price_cents_snapshot, quantity").eq("order_id", orderId).order("created_at", {
    ascending: true
  });
  if (error) {
    console.error("[send-reminder-mail] load order_items failed", error);
    return [];
  }
  return (rows ?? []).map((r)=>{
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
}
async function processOneOrder(admin, appBaseUrl, orderId, debug, prefetched) {
  // 1) idempotence
  const { data: logged, error: logErr } = await admin.rpc("log_email_once", {
    p_order_id: orderId,
    p_kind: "reminder_v1"
  });
  if (logErr) {
    console.error("[send-reminder-mail] log_email_once failed", logErr);
    return {
      status: "invalid",
      detail: "log_failed"
    };
  }
  if (!logged) return {
    status: "already_sent"
  };
  // 2) load order/event si pas prefetched
  let buyerEmail = prefetched?.buyerEmail ?? "";
  let bookingToken = prefetched?.bookingToken ?? "";
  let eventTitle = prefetched?.eventTitle ?? "Votre événement";
  let startsAt = prefetched?.startsAt ?? null;
  let location = prefetched?.location ?? null;
  let description = prefetched?.description ?? null;
  const reminderDays = prefetched?.reminderDays ?? 0;
  let currency = prefetched?.currency ?? "EUR";
  let totalCents = prefetched?.totalCents ?? 0;
  let paidCents = prefetched?.paidCents ?? 0;
  if (!prefetched) {
    const { data: o, error: oErr } = await admin.from("orders").select("id, event_id, buyer_email, booking_token, currency, total_cents, paid_cents").eq("id", orderId).maybeSingle();
    if (oErr || !o?.id) return {
      status: "invalid",
      detail: "order_not_found"
    };
    buyerEmail = String(o.buyer_email ?? "").trim();
    bookingToken = String(o.booking_token ?? "").trim();
    currency = String(o.currency ?? "EUR").trim() || "EUR";
    totalCents = Number(o.total_cents ?? 0) || 0;
    paidCents = Number(o.paid_cents ?? 0) || 0;
    if (o.event_id) {
      const { data: ev } = await admin.from("events").select("title, description, starts_at, location").eq("id", String(o.event_id)).maybeSingle();
      if (ev?.title) eventTitle = String(ev.title);
      startsAt = ev?.starts_at ? String(ev.starts_at) : null;
      location = ev?.location ? String(ev.location) : null;
      description = ev?.description ? String(ev.description) : null;
    }
  }
  if (!looksLikeEmail(buyerEmail) || !bookingToken || !startsAt) {
    return {
      status: "invalid",
      detail: "missing_fields"
    };
  }
  const items = await loadOrderItems(admin, orderId);
  const orderUrl = `${appBaseUrl}/order/${orderId}?token=${encodeURIComponent(bookingToken)}`;
  const subject = `Rappel – ${eventTitle}`;
  const html = buildOrderReminderHtml({
    eventTitle,
    startsAt,
    location,
    description,
    orderUrl,
    reminderDays,
    currency,
    items,
    totalCents,
    paidCents
  });
  if (debug) {
    return {
      status: "sent",
      detail: {
        to: buyerEmail,
        subject,
        orderUrl,
        startsAt,
        reminderDays,
        currency,
        totalCents,
        paidCents,
        itemsCount: items.length
      }
    };
  }
  await sendMail({
    to: buyerEmail,
    subject,
    content: html,
    isHtml: true
  });
  return {
    status: "sent"
  };
}
