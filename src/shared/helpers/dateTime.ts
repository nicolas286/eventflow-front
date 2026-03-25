/* ---------------- Date/Time helpers ---------------- */

const pad2 = (n: number) => String(n).padStart(2, "0");

function toValidDate(value: unknown): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Format "humain" fr-FR (dd/mm/yyyy hh:mm)
 */
export function formatDateTimeHuman(value: unknown): string {
  const d = toValidDate(value);
  if (!d) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/**
 * Convertit une date (ISO, Date, etc.) vers le format attendu par <input type="datetime-local" />
 * => "YYYY-MM-DDTHH:mm" (en heure locale)
 */
export function isoToLocalInput(value: unknown): string {
  const d = toValidDate(value);
  if (!d) return "";
  const yyyy = d.getFullYear();
  const mm = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  const hh = pad2(d.getHours());
  const mi = pad2(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

/**
 * Convertit la valeur de <input type="datetime-local" /> en ISO UTC
 */
export function localInputToIso(value: string): string {
  if (!value) return "";
  const d = new Date(value); // interprété en local
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
}

/**
 * Renvoie la valeur à passer à l'attribut min/max de datetime-local
 * Ex:
 *   min={localDateTimeMinNow()}
 *   min={localDateTimeMinNow(5)} // maintenant + 5 min
 */
export function localDateTimeMinNow(offsetMinutes = 0): string {
  const d = new Date();
  if (offsetMinutes) d.setMinutes(d.getMinutes() + offsetMinutes);
  // important: arrondir à la minute (datetime-local est souvent au format minute)
  d.setSeconds(0, 0);
  return isoToLocalInput(d);
}

/**
 * Optionnel: clamp UI (si le user tape manuellement une valeur < min)
 * Retourne un ISO propre, en respectant un min local.
 */
export function clampLocalInputToMinIso(localValue: string, minLocal: string): string {
  if (!localValue) return "";
  const chosen = new Date(localValue);
  const min = new Date(minLocal);
  if (Number.isNaN(chosen.getTime()) || Number.isNaN(min.getTime())) return "";
  const final = chosen.getTime() < min.getTime() ? min : chosen;
  return final.toISOString();
}

/* ---------------- Day ISO helpers ---------------- */

export function toDayStartISO(d: string) {
  return `${d}T00:00:00.000Z`;
}

export function toDayEndISO(d: string) {
  return `${d}T23:59:59.999Z`;
}

/* -------------------------- Duration calculation -------------------------- */

export function getDurationLabel(startsAt?: string | null, endsAt?: string | null) {
  if (!startsAt || !endsAt) return null;

  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;

  const diffMs = end - start;
  const totalMinutes = Math.round(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours && minutes) return `${hours}h${minutes.toString().padStart(2, "0")}`;
  if (hours) return `${hours}h`;
  return `${minutes} min`;
}

/* ------------------------- Days until calculation ------------------------- */

export function getDaysUntil(ts: number, nowTs: number) {
  return Math.ceil((ts - nowTs) / (1000 * 60 * 60 * 24));
}
