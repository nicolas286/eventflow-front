import type { RegistrationFieldLike } from "../../features/admin/events/singleEvent/AttendeeEditorPanel";
import type { AttendeeAnswers as AttendeeAnswer } from "../models/db/db.attendeeAnswers.schema";
import type { EventFormFieldUI } from "../models/db/db.eventFormFields.schema";

type ValueMap = Record<string, unknown>;

type RegFieldType = "text" | "number" | "date" | "checkbox" | (string & {});

export type UpdateAttendeeAnswerPatch =
  | { fieldKey: string; valueBool: boolean }
  | { fieldKey: string; valueInt: number }
  | { fieldKey: string; valueDate: string }
  | { fieldKey: string; valueText: string };

export type UpdateAttendeePayload = { answers: UpdateAttendeeAnswerPatch[] };

type FieldMeta = {
  key: string;
  raw: unknown;

  fieldType: RegFieldType;
  label: string;

  isCheckbox: boolean;


  trimmed: string; 
  isEmpty: boolean; 
  boolValue: boolean; 
};

function buildRegFieldMap(regFields: EventFormFieldUI[]) {
  const byKey = new Map<string, EventFormFieldUI>();
  for (const f of regFields ?? []) {
    const k = String((f as { fieldKey?: unknown }).fieldKey ?? "").trim();
    if (k) byKey.set(k, f);
  }
  return byKey;
}

export function forEachRegValue(
  regFields: EventFormFieldUI[],
  value: ValueMap | null | undefined,
  fn: (m: FieldMeta) => void
) {
  const byKey = buildRegFieldMap(regFields);

  for (const [key, raw] of Object.entries(value ?? {})) {
    const k = String(key ?? "").trim();
    if (!k) continue;

    const field = byKey.get(k);

    const fieldType = String(field?.fieldType ?? "text") as RegFieldType;
    const label = String(field?.label ?? k).trim();

    const isCheckbox = fieldType === "checkbox";
    const trimmed = String(raw ?? "").trim();
    const isEmpty = !isCheckbox && trimmed.length === 0;

    const boolValue = Boolean(raw);

    fn({ key: k, raw, fieldType, label, isCheckbox, trimmed, isEmpty, boolValue });
  }
}

export function makeLocalAnswers(params: {
  attendeeId: string;
  regFields: EventFormFieldUI[];
  value: ValueMap;
}): AttendeeAnswer[] {
  const { attendeeId, regFields, value } = params;
  const now = new Date().toISOString();

  const out: AttendeeAnswer[] = [];

  forEachRegValue(regFields, value, (m) => {
    if (m.isEmpty) return;

    const fieldTypeSnapshot = (m.fieldType ?? "text") as AttendeeAnswer["fieldTypeSnapshot"];
    const v = m.isCheckbox ? (m.boolValue ? "Oui" : "Non") : m.trimmed;

    out.push({
      id: `local:${attendeeId}:${m.key}`,
      attendeeId,
      fieldKeySnapshot: m.key,
      fieldTypeSnapshot,
      fieldLabelSnapshot: m.label,
      value: v,
      createdAt: now,
      updatedAt: now,
    });
  });

  return out;
}

export function buildUpdateAttendeeFromForm(params: {
  regFields: EventFormFieldUI[];
  value: ValueMap;
}): UpdateAttendeePayload {
  const { regFields, value } = params;

  const answers: UpdateAttendeeAnswerPatch[] = [];

  forEachRegValue(regFields, value, (m) => {
    const fieldKey = m.key;

    if (m.isCheckbox) {
      answers.push({ fieldKey, valueBool: m.boolValue });
      return;
    }

    if (m.fieldType === "number") {
      if (m.isEmpty) answers.push({ fieldKey, valueText: "" });
      else answers.push({ fieldKey, valueInt: Number(m.raw) });
      return;
    }

    if (m.fieldType === "date") {
      answers.push({ fieldKey, valueDate: m.isEmpty ? "" : m.trimmed });
      return;
    }

    answers.push({ fieldKey, valueText: m.isEmpty ? "" : m.trimmed });
  });

  return { answers };
}
