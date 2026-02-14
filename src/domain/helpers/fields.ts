import { normalizeText } from "./normalize";
import { type EventFormFieldUI, type EventFormFieldOptions } from "../models/db/db.eventFormFields.schema";

export function isBlank(v: unknown): boolean {
  return v == null || (typeof v === "string" && v.trim() === "");
}

export function isFilled(v: unknown): boolean {
  return !isBlank(v);
}

export function isBirthDateField(f: EventFormFieldUI) {
  const k = normalizeText(f.fieldKey);
  const l = normalizeText(f.label);
  return k === "birthdate" || k === "dob" || l.includes("date de naissance");
}

export function isCountryField(f: EventFormFieldUI) {
  const k = normalizeText(f.fieldKey);
  const l = normalizeText(f.label);
  return k === "country" || k === "pays" || l === "pays";
}

export function isPhoneField(f: EventFormFieldUI) {
  const k = normalizeText(f.fieldKey);
  const l = normalizeText(f.label);
  return k === "phone" || k === "telephone" || k === "tel" || l.includes("telephone");
}

export function sortFields(fields: EventFormFieldUI[]) {
  const arr = [...(fields ?? [])];
    arr.sort((a: EventFormFieldUI, b: EventFormFieldUI) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    return arr;
}

export function isFieldFilled(field: EventFormFieldUI, attendeeValues: Record<string, unknown>) {
    const v = attendeeValues[field.fieldKey];
    if (field.fieldType === "checkbox") return v === true;
    if (typeof v === "string") return v.trim().length > 0;
    if (typeof v === "number") return Number.isFinite(v);
    if (typeof v === "boolean") return true;
    return v != null;
}

export function areAllAttendeesValid(
  attendees: Array<{ values: Record<string, unknown> }>,
  fields: Array<{ isRequired?: boolean }>,
  isFieldFilled: (field: EventFormFieldUI, values: Record<string, unknown>) => boolean
) {
  if (!attendees || attendees.length === 0) return true;
  if (!fields || fields.length === 0) return true;

  return attendees.every((a) =>
    fields.every((f: any) => (!f.isRequired ? true : isFieldFilled(f, a.values ?? {})))
  );
}

type SelectOption = { label: string; value: string };

export function toSelectOptions(options: EventFormFieldOptions | undefined): SelectOption[] {
  if (!options) return [];

  if (Array.isArray(options)) {
    // [{label,value}]
    if (options.length > 0 && typeof options[0] === "object" && options[0] !== null) {
      return (options as any[])
        .map((o) => ({
          label: String((o as any).label ?? (o as any).value ?? ""),
          value: String((o as any).value ?? ""),
        }))
        .filter((o) => o.value.trim().length > 0);
    }

    // ["a","b"]
    return (options as string[])
      .map((s) => String(s))
      .map((s) => ({ label: s, value: s }))
      .filter((o) => o.value.trim().length > 0);
  }

  return Object.entries(options as Record<string, any>)
    .map(([k, v]) => {
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
        const s = String(v);
        return { label: s, value: k };
      }
      if (v && typeof v === "object") {
        const label = String(v.label ?? v.value ?? k);
        const value = String(v.value ?? k);
        return { label, value };
      }
      return null;
    })
    .filter((x): x is SelectOption => !!x && x.value.trim().length > 0);
}

export function getFieldKey(f: { fieldKey?: unknown }) {
  return String(f.fieldKey ?? "").trim();
}


