import { getFirst } from "./logic";

/* ============================================================
   FILE / EXPORT HELPERS
   ============================================================ */

/**
 * Nettoie une string pour qu'elle soit utilisable comme nom de fichier (cross-platform).
 * - remplace les caractères interdits par "-"
 * - normalise les espaces
 * - coupe à `maxLen`
 * - retombe sur `fallback` si vide
 */
export function safeFilename(input: unknown, fallback = "file", maxLen = 60) {
  const base = String(input ?? "").trim() || fallback;

  const cleaned = base
    .replace(/[\\/:*?"<>|]+/g, "-") // caractères interdits (Windows/macOS)
    .replace(/\s+/g, " ") // espaces multiples
    .trim();

  const sliced = cleaned.slice(0, maxLen).trim();

  return sliced || fallback;
}

/**
 * Produit un titre d'événement "safe" (utilisable en nom de fichier),
 * en prenant `event.title` ou `event.name` si dispo.
 *
 * Typage volontairement défensif: on accepte n'importe quel objet
 * contenant potentiellement `{ event: { title?: unknown, name?: unknown } }`.
 */
export function safeEventTitle(
  data: { event?: Record<string, unknown> } | null | undefined,
  fallback = "event"
) {
  const title = getFirst<unknown>(data?.event, ["title", "name"]) ?? fallback;
  return safeFilename(title, fallback, 60);
}

/* ============================================================
   NULLABILITY / TRIM HELPERS
   ============================================================ */

/**
 * Si `v` est une string vide (après trim) => `null`.
 * - `undefined` reste `undefined`
 * - `null` reste `null`
 * - non-string => `undefined`
 *
 * Utile quand tu veux distinguer:
 * - "champ absent" (undefined)
 * - "champ volontairement vidé" (null)
 */
export function emptyToNull(v: unknown): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t === "" ? null : t;
}

/**
 * Trim défensif qui préserve `null`.
 * - `null` => null
 * - `undefined` / "" / "   " => null
 * - sinon string trimée
 */
export function toNullableTrimmed(v: string | null | undefined) {
  if (v === null) return null;
  const t = v?.trim();
  return t === "" ? null : t;
}

/* ============================================================
   TEXT NORMALIZATION
   ============================================================ */

/**
 * Normalise un texte pour comparaisons / recherche:
 * - trim
 * - minuscules
 * - suppression des accents/diacritiques
 */
export function normalizeText(s: unknown) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

/**
 * Génère une clé "slug" (format underscore) à partir d'une string:
 * - lowercase
 * - suppression des accents
 * - remplace les séquences non-alphanum par "_"
 * - évite les "_" en début/fin + condense "__"
 */
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

/**
 * Convertit une valeur en texte affichable.
 * - null/undefined => fallback
 * - string vide (après trim) => fallback
 */
export function toDisplayText(value: unknown, fallback = "—"): string {
  if (value == null) return fallback;
  const s = String(value).trim();
  return s ? s : fallback;
}

/* ============================================================
   FORMATTING
   ============================================================ */

/**
 * Formatte une date/heure de manière lisible (fr-BE).
 * Défensif:
 * - valeur vide => "—"
 * - date invalide => renvoie la valeur brute en string
 */
export function formatDateTime(value: unknown): string {
  if (value == null || value === "") return "—";

  const d = value instanceof Date ? value : new Date(String(value));

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

/**
 * Formatte un montant à partir de cents.
 * Défensif:
 * - cents manquant => 0
 * - currency manquante => EUR
 */
export function formatMoney(cents?: number, currency?: string) {
  const c = typeof cents === "number" ? cents : 0;
  const cur = currency || "EUR";
  try {
    return new Intl.NumberFormat("fr-BE", { style: "currency", currency: cur }).format(c / 100);
  } catch {
    return `${(c / 100).toFixed(2)} ${cur}`;
  }
}

/* ============================================================
   DATA SHAPES
   ============================================================ */

type RowsLike<T> = T[] | { rows?: T[] } | null | undefined;

/**
 * Normalise une valeur de type:
 * - tableau direct
 * - objet { rows: [...] }
 * - null/undefined
 * en un tableau (toujours défini).
 */
export function toRows<T>(value: RowsLike<T>): T[] {
  if (Array.isArray(value)) return value;
  if (value?.rows && Array.isArray(value.rows)) return value.rows;
  return [];
}

/**
 * Réattribue des `sortOrder` contigus (1..n) en conservant l'ordre actuel.
 * Utile après réordonnancement UI.
 */
export function normalizeContiguousSortOrder<T extends { sortOrder: number }>(list: T[]): T[] {
  return list.map((x, idx) => ({ ...x, sortOrder: idx + 1 }));
}

/* ============================================================
   URL NORMALIZATION
   ============================================================ */

/**
 * Normalise une URL de site web entrée par un utilisateur.
 *
 * Règles :
 * - trim + string vide → null
 * - ajoute https:// si aucun protocole
 * - supprime les slashs finaux
 */
export function normalizeWebsite(input: string | null | undefined): string | null {
  const value = toNullableTrimmed(input);
  if (!value) return null;

  const withProtocol = /^https?:\/\//i.test(value)
    ? value
    : `https://${value}`;

  return withProtocol.replace(/\/+$/, "");
}