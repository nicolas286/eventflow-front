export function escapeHtml(s: unknown) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function truncate(s: unknown, max = 700) {
  const t = String(s ?? "").trim();

  if (t.length <= max) return t;

  return t.slice(0, max - 1).trimEnd() + "…";
}