import { z } from "zod";
import type { EventFormFieldUI } from "../models/db/db.eventFormFields.schema";
import { isBirthDateField } from "./fields";

const MAX_TEXT_LEN = 100;         
const MAX_EMAIL_LEN = 100;         
const MAX_SELECT_LEN = 120;        
const MAX_PHONE_LEN = 32;           

function isEmptyString(v: unknown) {
  return typeof v === "string" && v.trim().length === 0;
}

function tooLong(v: string, max: number) {
  return v.length > max ? `Trop long (max ${max} caractères).` : null;
}

function normalizeString(v: unknown) {
  return typeof v === "string" ? v.trim() : "";
}

export function validateFieldValue(f: EventFormFieldUI, value: unknown): string | null {
  const required = Boolean(f?.isRequired);
  const type = String(f?.fieldType ?? "text");

  // ✅ 1) LENGTH (ne return que si erreur)
  if (typeof value === "string") {
    let max = MAX_TEXT_LEN;

    if (type === "email") max = MAX_EMAIL_LEN;
    else if (type === "phone") max = MAX_PHONE_LEN;
    else if (type === "select" || type === "radio" || type === "country") max = MAX_SELECT_LEN;
    else if (type === "textarea") max = 5000;

    const msg = tooLong(value, max);
    if (msg) return msg;
  }

  // ✅ 2) REQUIRED
  if (!required) {
    if (value == null) return null;
    if (isEmptyString(value)) return null;
    if (type === "checkbox") return null;
  } else {
    if (type === "checkbox") return value === true ? null : "Ce champ est requis.";
    if (value == null) return "Ce champ est requis.";
    if (typeof value === "string" && value.trim() === "") return "Ce champ est requis.";
  }

  // ✅ 3) FORMAT / TYPE
  if (isBirthDateField(f) || type === "date") {
    const s = normalizeString(value);
    if (!s) return required ? "Date requise." : null;
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? null : "Date invalide.";
  }

  if (type === "number") {
    if (typeof value !== "number" || !Number.isFinite(value)) return "Nombre invalide.";
    return null;
  }

  if (type === "email") {
    const s = normalizeString(value);
    if (!s) return required ? "Email requis." : null;
    return z.string().email().safeParse(s).success ? null : "Email invalide.";
  }

  if (typeof value === "string") return null;
  if (typeof value === "boolean") return null;

  return required ? "Ce champ est requis." : null;
}

