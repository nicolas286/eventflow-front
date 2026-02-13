import { normalizeText } from "./normalize";
import { type EventFormFieldUI } from "../models/db/db.eventFormFields.schema";
import { z } from "zod";

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

export function validateFieldValue(f: EventFormFieldUI, value: unknown): string | null {
  if (!f?.isRequired) return null;

  if (f.fieldType === "checkbox") return value === true ? null : "Ce champ est requis.";

  if (value == null) return "Ce champ est requis.";

  if (isBirthDateField(f) || f.fieldType === "date") {
    if (typeof value !== "string" || value.trim() === "") return "Date requise.";
    return /^\d{4}-\d{2}-\d{2}$/.test(value) ? null : "Date invalide.";
  }

  if (f.fieldType === "number") {
    if (typeof value !== "number" || !Number.isFinite(value)) return "Nombre invalide.";
    return null;
  }

  if (f.fieldType === "email") {
    if (typeof value !== "string" || value.trim() === "") return "Email requis.";
    return z.email().safeParse(value.trim()).success ? null : "Email invalide.";
  }

  if (typeof value === "string") return value.trim() ? null : "Ce champ est requis.";
  if (typeof value === "boolean") return null;

  return "Ce champ est requis.";
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
