import type { PublicFormField as Field } from "@app/modules/public/events/schemas/public.eventDetailBySlug.schema";
import type { EventFormFieldUI } from "@shared/models/db/db.eventFormFields.schema";
import { validateFieldValue } from "@shared/helpers/validateFieldValue";
import { getFieldKey } from "@shared/helpers/fields";

export type PublicAttendeeDraft = Record<string, unknown> & { eventProductId: string };

export type AttendeeSlot = {
  eventProductId: string;
  values: Record<string, unknown>;
};

export type TouchedMap = Record<number, Record<string, true>>;

export function computeAttendeeErrors(fields: Field[], values: Record<string, unknown>) {
  const errs: Record<string, string> = {};

  for (const f of fields) {
    const key = getFieldKey(f) || String(f?.fieldKey ?? "").trim();
    if (!key) continue;

    const msg = validateFieldValue(f as EventFormFieldUI, values[key]);
    if (msg) errs[key] = msg;
  }

  return errs;
}

export function draftToSlots(
  draftAtts: PublicAttendeeDraft[] | null | undefined
): AttendeeSlot[] {
  return [...(draftAtts ?? [])].map((a) => {
    const { eventProductId, ...rest } = a;
    return { eventProductId, values: { ...rest } };
  });
}

export function slotsToDraft(slots: AttendeeSlot[]): PublicAttendeeDraft[] {
  return slots.map((s) => ({
    eventProductId: s.eventProductId,
    ...(s.values ?? {}),
  }));
}

export function markTouched(
  prev: TouchedMap,
  attIndex: number,
  fieldKey: string
): TouchedMap {
  const row = prev[attIndex] ?? {};
  if (row[fieldKey]) return prev;

  return {
    ...prev,
    [attIndex]: {
      ...row,
      [fieldKey]: true,
    },
  };
}

export function buildTouchedMapForAllFields(
  slotsLength: number,
  fields: Field[]
): TouchedMap {
  const next: TouchedMap = {};

  for (let i = 0; i < slotsLength; i++) {
    const row: Record<string, true> = {};
    for (const f of fields) {
      const key = String(f.fieldKey ?? "").trim();
      if (key) row[key] = true;
    }
    next[i] = row;
  }

  return next;
}

export function buildGroupedFieldSections(
  sortedFields: Field[],
  sortedFieldGroups: Array<{
    id: string;
    label: string;
    description?: string | null;
    sortOrder?: number | null;
  }>
) {
  const ungroupedFields = sortedFields.filter((f) => !f.groupId);

  const groupedSections = sortedFieldGroups
    .map((group) => ({
      group,
      fields: sortedFields.filter((f) => f.groupId === group.id),
    }))
    .filter((section) => section.fields.length > 0);

  if (ungroupedFields.length > 0) {
    return [
      {
        group: null,
        fields: ungroupedFields,
      },
      ...groupedSections,
    ];
  }

  return groupedSections;
}