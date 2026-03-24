// supabase/functions/send-confirmation-mail/mailTemplate.ts
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
export function buildOrderConfirmationHtml(p) {
  const title = escapeHtml(p.eventTitle);
  const when = formatBrussels(p.startsAt ?? null);
  const location = String(p.location ?? "").trim();
  const desc = truncate(String(p.description ?? ""), 900);
  const total = Math.max(0, Number(p.totalCents ?? 0));
  const paid = Math.max(0, Number(p.paidCents ?? 0));
  const due = Math.max(0, total - paid);
  const itemsRows = p.items.filter((x)=>x.qty > 0).map((x)=>{
    return `
<tr>
<td style="padding:10px 12px;border-top:1px solid #eee;">
<div style="font-weight:700">${escapeHtml(x.name)}</div>
</td>

<td style="padding:10px 12px;border-top:1px solid #eee;text-align:center;">
${x.qty}
</td>

<td style="padding:10px 12px;border-top:1px solid #eee;text-align:right;">
${escapeHtml(formatMoney(x.unitCents, p.currency))}
</td>

<td style="padding:10px 12px;border-top:1px solid #eee;text-align:right;font-weight:700;">
${escapeHtml(formatMoney(x.lineCents, p.currency))}
</td>
</tr>
`;
  }).join("");
  const itemsTable = p.items.length ? `
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
${itemsRows}
</tbody>

</table>
</div>

<div style="margin-top:10px;text-align:right;font-size:14px">

<div style="margin:4px 0">
<span style="opacity:.75">Total :</span>
<strong>${escapeHtml(formatMoney(total, p.currency))}</strong>
</div>

<div style="margin:4px 0">
<span style="opacity:.75">Payé :</span>
<strong>${escapeHtml(formatMoney(paid, p.currency))}</strong>
</div>

${due > 0 ? `<div style="margin:4px 0">
<span style="opacity:.75">Reste à payer :</span>
<strong>${escapeHtml(formatMoney(due, p.currency))}</strong>
</div>` : ""}

</div>
` : ``;
  return `
<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;line-height:1.6;color:#111;background:#fafafa;padding:24px">

<div style="max-width:680px;margin:0 auto">

<div style="background:#fff;border:1px solid #eee;border-radius:16px;padding:20px">

<div style="font-size:18px;font-weight:900;margin:0 0 10px">
🎟️ Inscription confirmée
</div>

<div style="margin:0 0 14px;color:#333">
Vous êtes bien inscrit·e à l’événement :
</div>

<div style="background:#f6f6f7;border-radius:14px;padding:14px 16px;margin:0 0 14px">

<div style="font-weight:900;font-size:16px;margin:0 0 6px">
${title}
</div>

${when ? `<div style="margin:6px 0;font-size:13px;opacity:.85">
<span style="font-weight:800">🗓️ Date</span> : ${escapeHtml(when)}
</div>` : ""}

${location ? `<div style="margin:6px 0;font-size:13px;opacity:.85">
<span style="font-weight:800">📍 Lieu</span> : ${escapeHtml(location)}
</div>` : ""}

</div>

${itemsTable}

${desc ? `
<div style="margin:16px 0 8px;font-weight:900">Détails</div>

<div style="white-space:pre-wrap;font-size:14px;color:#333;opacity:.95">
${escapeHtml(desc)}
</div>
` : ""}

</div>

<div style="text-align:center;font-size:11px;opacity:.55;margin-top:12px">
Eventflow
</div>

</div>
</div>
`;
}
