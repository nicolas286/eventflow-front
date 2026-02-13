export function emptyToNull(v: unknown): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t === "" ? null : t;
}

export function normalizeText(s: unknown) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

export function toDisplayText(value: unknown, fallback = "—"): string {
  if (value == null) return fallback;
  const s = String(value).trim();
  return s ? s : fallback;
}

export function formatDateTime(value: unknown): string {
  if (value == null || value === "") return "—";

  const d = value instanceof Date ? value : new Date(value as any);

  if (Number.isNaN(d.getTime())) {
    return String(value);
  }

  try {
    return new Intl.DateTimeFormat("fr-BE", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  } catch {
    return d.toISOString();
  }
}


type RowsLike<T> = T[] | { rows?: T[] } | null | undefined;

export function toRows<T>(value: RowsLike<T>): T[] {
  if (Array.isArray(value)) return value;
  if (value?.rows && Array.isArray(value.rows)) return value.rows;
  return [];
}

