// supabase/functions/send-confirmation-mail/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ---------------- JSON helpers ---------------- */

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function bad(msg: string, status = 400) {
  return json({ ok: false, error: msg }, status);
}

/* ---------------- utils ---------------- */

function envTrim(name: string): string | null {
  const v = Deno.env.get(name);
  const t = typeof v === "string" ? v.trim() : "";
  return t ? t : null;
}

function looksLikeEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function isValidUuid(v: unknown): boolean {
  if (typeof v !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function escapeHtml(s: string) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function truncate(s: string, max = 700) {
  const t = String(s ?? "").trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1).trimEnd() + "…";
}

function formatBrussels(iso: string | null) {
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
    minute: "2-digit",
  }).format(d);
}

function formatMoney(cents: number, currency: string) {
  const n = Number(cents ?? 0) / 100;
  try {
    return new Intl.NumberFormat("fr-BE", { style: "currency", currency }).format(n);
  } catch {
    // fallback si currency chelou
    return `${(n).toFixed(2)} ${currency}`;
  }
}

/* ---------------- template HTML (centralisé) ---------------- */

type OrderItemSnap = {
  name: string;
  qty: number;
  unitCents: number;
  lineCents: number;
};

function buildOrderConfirmationHtml(p: {
  eventTitle: string;
  startsAt?: string | null;
  location?: string | null;
  description?: string | null;

  orderUrl: string;

  currency: string;
  items: OrderItemSnap[];

  totalCents: number;
  paidCents: number;
}) {
  const title = escapeHtml(p.eventTitle);
  const when = formatBrussels(p.startsAt ?? null);
  const location = String(p.location ?? "").trim();
  const desc = truncate(String(p.description ?? ""), 900);

  const total = Math.max(0, Number(p.totalCents ?? 0));
  const paid = Math.max(0, Number(p.paidCents ?? 0));
  const due = Math.max(0, total - paid);

  const itemsRows = p.items
    .filter((x) => x.qty > 0)
    .map((x) => {
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
    })
    .join("");

  const itemsTable = p.items.length
    ? `
      <div style="margin:14px 0 6px;font-weight:800">Billets</div>

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
    `
    : ``;

  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;line-height:1.6;color:#111;background:#fafafa;padding:24px">
    <div style="max-width:680px;margin:0 auto">
      <div style="background:#fff;border:1px solid #eee;border-radius:16px;padding:20px">
        <div style="font-size:18px;font-weight:900;margin:0 0 10px">🎟️ Inscription confirmée</div>
        <div style="margin:0 0 14px;color:#333">Vous êtes bien inscrit·e à l’événement :</div>

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

/* ---------------- mail service call ---------------- */

async function sendMail(payload: { to: string; subject: string; content: string; isHtml: boolean }) {
  const url = envTrim("MAIL_SERVICE_URL");
  const token = envTrim("MAIL_SERVICE_TOKEN");

  if (!url) throw new Error("MAIL_SERVICE_URL missing");
  if (!token) throw new Error("MAIL_SERVICE_TOKEN missing");

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10_000);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      "x-service-token": token,
    },
    body: JSON.stringify(payload),
    signal: ctrl.signal,
  }).finally(() => clearTimeout(t));

  const text = await res.text().catch(() => "");
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text.slice(0, 300) };
  }

  if (!res.ok || !data?.ok) {
    console.error("mail-service failed", { status: res.status, data, url });
    throw new Error("MAIL_SERVICE_FAILED");
  }
}

/* ---------------- types input ---------------- */

type SendMailInput = {
  to?: string;
  subject?: string;

  // legacy / custom
  content?: string;
  isHtml?: boolean;

  // template mode
  templateId?: "order_confirmation_v1";
  templateData?: {
    orderId: string;
  };
};

/* ---------------- edge ---------------- */

Deno.serve(async (req) => {
  if (req.method !== "POST") return bad("Method not allowed", 405);

  const expected = envTrim("EDGE_SERVICE_TOKEN");
  const received = envTrimHeader(req, "x-service-token");

  if (!expected) return bad("EDGE_SERVICE_TOKEN missing", 500);
  if (!received || received !== expected) return bad("Unauthorized", 401);

  let body: SendMailInput;
  try {
    body = await req.json();
  } catch {
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
      const { data: o, error: oErr } = await admin
        .from("orders")
        .select("id, event_id, currency, total_cents, paid_cents, buyer_email, booking_token")
        .eq("id", orderId)
        .maybeSingle();

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
      let startsAt: string | null = null;
      let location: string | null = null;
      let description: string | null = null;

      if (o.event_id) {
        const { data: ev } = await admin
          .from("events")
          .select("title, description, starts_at, location")
          .eq("id", String(o.event_id))
          .maybeSingle();

        if (ev?.title) eventTitle = String(ev.title);
        startsAt = (ev as any)?.starts_at ? String((ev as any).starts_at) : null;
        location = (ev as any)?.location ? String((ev as any).location) : null;
        description = (ev as any)?.description ? String((ev as any).description) : null;
      }

      // 3) items (snapshots)
      const { data: rows, error: itErr } = await admin
        .from("order_items")
        .select("product_name_snapshot, unit_price_cents_snapshot, quantity")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });

      if (itErr) console.error("[send-confirmation-mail] load order_items failed", itErr);

      const items: OrderItemSnap[] = (rows ?? [])
        .map((r: any) => {
          const name = String(r?.product_name_snapshot ?? "").trim() || "Billet";
          const qty = Number(r?.quantity ?? 0);
          const unitCents = Number(r?.unit_price_cents_snapshot ?? 0);
          if (!Number.isFinite(qty) || qty <= 0) return null;
          if (!Number.isFinite(unitCents) || unitCents < 0) return null;
          return { name, qty, unitCents, lineCents: unitCents * qty };
        })
        .filter(Boolean) as OrderItemSnap[];

      const orderUrl = `${appBaseUrl}/order/${orderId}?token=${encodeURIComponent(bookingToken)}`;

      const subject = (String(body?.subject ?? "").trim() || `Inscription confirmée – ${eventTitle}`);

      const html = buildOrderConfirmationHtml({
        eventTitle,
        startsAt,
        location,
        description,
        orderUrl,
        currency,
        items,
        totalCents,
        paidCents,
      });

      // ✅ idempotence: log une seule fois le mail de confirmation
const { data: canSend, error: logErr } = await admin.rpc("log_email_once", {
  p_order_id: orderId,
  p_kind: "confirmation_v1",
});

if (logErr) {
  console.error("[send-confirmation-mail] log_email_once failed", logErr);
  // on évite d’envoyer si on ne sait pas logger (sinon doublons)
  return json({ ok: false, error: "LOG_FAILED" }, 502);
}

if (!canSend) {
  // déjà envoyé -> on répond ok pour être “safe” en retry
  return json({ ok: true, skipped: "already_sent" });
}

await sendMail({ to, subject, content: html, isHtml: true });
return json({ ok: true, sent: true });
    }

    // ✅ LEGACY / CUSTOM CONTENT (backward compatible)
    const to = String(body?.to ?? "").trim();
    const subject = String(body?.subject ?? "").trim();
    const isHtml = body?.isHtml ?? true;

    if (!looksLikeEmail(to)) return bad("Invalid recipient email");
    if (!subject) return bad("Missing subject");

    const content = String(body?.content ?? "").trim();
    if (!content) return bad("Missing content or templateId");

    await sendMail({ to, subject, content, isHtml });
    return json({ ok: true });
  } catch (err) {
    console.error("send-confirmation-mail error:", err);
    return json({ ok: false, error: "SEND_FAILED" }, 502);
  }
});

function envTrimHeader(req: Request, name: string): string | null {
  const v = req.headers.get(name) ?? "";
  const t = v.trim();
  return t ? t : null;
}