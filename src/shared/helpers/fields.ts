import { normalizeText } from "./normalize";
import type { EventFormFieldUI, EventFormFieldOptions, EventFormField } from "../models/db/db.eventFormFields.schema";
import { clampInt } from "./logic";

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

type SortableField = {
  sortOrder?: number | null;
};

export function sortFields<T extends SortableField>(fields: T[] | null | undefined): T[] {
  const arr = [...(fields ?? [])];

  arr.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

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

export function optionsToText(options: EventFormFieldOptions | undefined): string {
  return toSelectOptions(options)
    .map((o) => o.label.trim())
    .filter(Boolean)
    .join("\n");
}

function textToLines(text: string | null | undefined): string[] {
  return String(text ?? "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function optionsToInlineText(options: EventFormFieldOptions | undefined, max = 80): string | null {
  const labels = toSelectOptions(options)
    .map((o) => o.label.trim())
    .filter(Boolean);

  if (labels.length === 0) return null;

  const joined = labels.join(" · ");
  if (joined.length <= max) return joined;

  return joined.slice(0, Math.max(0, max - 1)).trimEnd() + "…";
}

export function textToOptions(
  text: string | null | undefined,
  makeValue: (label: string) => string = (label) => label
): SelectOption[] {
  return textToLines(text)
    .map((label) => ({ label, value: makeValue(label) }))
    .filter((o) => o.value.trim().length > 0);
}

export function textToSelectOptions(text: string): SelectOption[] {
  return textToOptions(text);
}

export function parseOptionsLines(text: string): EventFormFieldOptions {
  const opts = textToLines(text).slice(0, 100);
  return opts.length ? opts : null;
}



export function sortFromDB(fields: EventFormField[]) {
  const arr = Array.isArray(fields) ? [...fields] : [];
arr.sort(
  (a, b) =>
    clampInt(a.sortOrder, { fallback: 0 }) -
    clampInt(b.sortOrder, { fallback: 0 })
);
  return arr;
}

export function buildFieldsSignature(fields: EventFormField[]) {
  return sortFromDB(fields)
    .map((f) => {
      const id = String(f.id);
      const updatedAt = f.updatedAt ?? "";
      const order = clampInt(f.sortOrder, { fallback: 0 });
      return `${id}:${updatedAt}:${order}`;
    })
    .join("|");
}

export function getFieldKey(f: { fieldKey?: unknown }) {
  return String(f.fieldKey ?? "").trim();
}

export function toNullIfEmpty(s: string) {
  const t = (s ?? "").trim();
  return t.length ? t : null;
}

export function centsToEuroInput(cents: number) {
  const v = Number.isFinite(cents) ? cents / 100 : 0;
  return v.toFixed(2).replace(".", ",");
}

export function euroInputToCents(raw: string) {
  const t = String(raw ?? "").trim();
  if (!t) return 0;
  const normalized = t.replace(",", ".");
  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.round(n * 100));
}


