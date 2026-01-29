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

export function inferCountryCode(country: string | null | undefined): string | null {
  const c = (country ?? "").trim();
  if (!c) return null;

  const key = keyifyCountryName(c);
  return COUNTRY_TO_CODE[key] ?? null;
}
