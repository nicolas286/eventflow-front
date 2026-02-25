// helpers/countries.ts
export const COUNTRY_TO_CODE: Record<string, string> = {
  belgique: "BE",
  france: "FR",
  luxembourg: "LU",
  pays_bas: "NL",
  allemagne: "DE",
  suisse: "CH",
  royaume_uni: "GB",
  espagne: "ES",
  italie: "IT",
  portugal: "PT",
  irlande: "IE",
  "états-unis": "US",
  canada: "CA",
};

function keyifyCountryName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // accents
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function inferCountryCode(country: string | null | undefined): string | undefined {
  const c = (country ?? "").trim();
  if (!c) return undefined;

  const key = keyifyCountryName(c);
  return COUNTRY_TO_CODE[key] ?? null;
}

export const CODE_TO_COUNTRY: Record<string, string> = Object.entries(COUNTRY_TO_CODE)
  .reduce((acc, [labelKey, code]) => {
    acc[code] = labelKey;
    return acc;
  }, {} as Record<string, string>);

function unkeyifyCountryName(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

export function countryCodeToLabel(code: string | null | undefined): string {
  const c = (code ?? "").trim().toUpperCase();
  if (!c) return "";

  const key = CODE_TO_COUNTRY[c];
  if (!key) return "";

  return unkeyifyCountryName(key);
}