export type CountryOption = {
  label: string;
  iso2: string;
  dial: string;
  flag: string;
};

export const COUNTRY_OPTIONS: CountryOption[] = [
  { label: "Belgique", iso2: "BE", dial: "+32", flag: "🇧🇪" },
  { label: "France", iso2: "FR", dial: "+33", flag: "🇫🇷" },
  { label: "Luxembourg", iso2: "LU", dial: "+352", flag: "🇱🇺" },
  { label: "Pays-Bas", iso2: "NL", dial: "+31", flag: "🇳🇱" },
  { label: "Allemagne", iso2: "DE", dial: "+49", flag: "🇩🇪" },
  { label: "Suisse", iso2: "CH", dial: "+41", flag: "🇨🇭" },
  { label: "Royaume-Uni", iso2: "GB", dial: "+44", flag: "🇬🇧" },
  { label: "Espagne", iso2: "ES", dial: "+34", flag: "🇪🇸" },
  { label: "Italie", iso2: "IT", dial: "+39", flag: "🇮🇹" },
  { label: "Portugal", iso2: "PT", dial: "+351", flag: "🇵🇹" },
  { label: "Irlande", iso2: "IE", dial: "+353", flag: "🇮🇪" },
  { label: "États-Unis", iso2: "US", dial: "+1", flag: "🇺🇸" },
  { label: "Canada", iso2: "CA", dial: "+1", flag: "🇨🇦" },
];

export function normalizeDigits(s: string) {
  return s.replace(/[^\d]/g, "");
}

/**
 * Parse un téléphone en :
 * - dial : indicatif (ex "+33")
 * - national : numéro local (digits only)
 *
 * Supporte "+33 612..." / "+33612..." / "06 12..." etc.
 */
export function parseE164(phoneRaw: string | null | undefined) {
  const p = (phoneRaw ?? "").trim();
  if (!p.startsWith("+")) return { dial: "", national: normalizeDigits(p) };

  const match = COUNTRY_OPTIONS
    .map((c) => c.dial)
    .sort((a, b) => b.length - a.length)
    .find((dial) => p.startsWith(dial));

  if (!match) return { dial: "", national: normalizeDigits(p) };

  const rest = p.slice(match.length);
  return { dial: match, national: normalizeDigits(rest) };
}

/**
 * Construit une forme e164 simplifiée : +33 + digits (sans espaces)
 * (comme tu le fais déjà dans ProfilePanel)
 */
export function buildE164(dial: string, national: string) {
  const d = (dial ?? "").trim();
  const n = normalizeDigits(national ?? "");
  if (!d && !n) return "";
  if (!d) return n;
  return `${d}${n}`;
}
