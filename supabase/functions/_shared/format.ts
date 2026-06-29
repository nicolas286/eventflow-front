export function formatDateTimeBrussels(iso: unknown) {
  if (!iso) return null;

  const d = new Date(String(iso));

  if (!Number.isFinite(d.getTime())) {
    return String(iso);
  }

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

export function formatMoney(cents: unknown, currency: string) {
  const n = Number(cents ?? 0) / 100;

  try {
    return new Intl.NumberFormat("fr-BE", {
      style: "currency",
      currency,
    }).format(n);
  } catch {
    return `${n.toFixed(2)} ${currency}`;
  }
}