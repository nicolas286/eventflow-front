export function validateFieldValue(f: any, value: unknown): string | null {
  if (!f?.isRequired) return null;

  // checkbox requis => true
  if (f.fieldType === "checkbox") return value === true ? null : "Ce champ est requis.";

  if (value == null) return "Ce champ est requis.";

  if (f.fieldType === "number") {
    if (typeof value !== "number" || !Number.isFinite(value)) return "Nombre invalide.";
    return null;
  }

  if (f.fieldType === "email") {
    if (typeof value !== "string" || value.trim() === "") return "Email requis.";
    const ok = z.string().email().safeParse(value.trim()).success;
    return ok ? null : "Email invalide.";
  }

  if (f.fieldType === "date") {
    if (typeof value !== "string" || value.trim() === "") return "Date requise.";
    // HTML date => YYYY-MM-DD
    const ok = /^\d{4}-\d{2}-\d{2}$/.test(value);
    return ok ? null : "Date invalide.";
  }

  // default string-like
  if (typeof value === "string") return value.trim() ? null : "Ce champ est requis.";
  if (typeof value === "boolean") return null;

  return "Ce champ est requis.";
}

export function computeAttendeeErrors(fields: any[], values: Record<string, unknown>) {
  const errs: Record<string, string> = {};
  for (const f of fields) {
    const key = String(f.fieldKey ?? "");
    if (!key) continue;
    const msg = validateFieldValue(f, values[key]);
    if (msg) errs[key] = msg;
  }
  return errs;
}
