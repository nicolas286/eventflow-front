import { type DraftField } from "../../features/admin/events/singleEvent/EventRegistrationFormPanel";


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

export function slugKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/__+/g, "_");
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

export function formatMoney(cents?: number, currency?: string) {
  const c = typeof cents === "number" ? cents : 0;
  const cur = currency || "EUR";
  try {
    return new Intl.NumberFormat("fr-BE", { style: "currency", currency: cur }).format(c / 100);
  } catch {
    return `${(c / 100).toFixed(2)} ${cur}`;
  }
}

type RowsLike<T> = T[] | { rows?: T[] } | null | undefined;

export function toRows<T>(value: RowsLike<T>): T[] {
  if (Array.isArray(value)) return value;
  if (value?.rows && Array.isArray(value.rows)) return value.rows;
  return [];
}

export function normalizeContiguousSortOrder(list: DraftField[]) {
  return list.map((f, idx) => ({ ...f, sortOrder: idx + 1 }));
}

export function toNullableTrimmed(v: string | null | undefined) {
  if (v === null) return null;
  const t = v?.trim();
  return t === "" ? null : t;
}


export function normalizeWebsite(input: string | null | undefined): string | null {
  const value = toNullableTrimmed(input);
  if (!value) return null;

  // Si déjà http:// ou https:// → on garde
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  // Sinon on force https://
  return `https://${value}`;
}
