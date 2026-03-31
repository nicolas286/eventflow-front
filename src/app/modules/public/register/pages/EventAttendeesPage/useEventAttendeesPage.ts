import { useMemo, useState } from "react";
import type { NavigateFunction } from "react-router-dom";

import { loadDraft, saveDraft } from "../../helpers/checkoutStore";
import {
  computeTotalCents,
  quantitiesToItems,
  resolveCurrency,
  sumItemQuantities,
  sortProducts,
  computeExpectedAttendeeSlots,
  reconcileAttendeesByIndex,
} from "@helpers/logic";
import {
  sortFields,
  isFieldFilled,
  areAllAttendeesValid,
} from "@helpers/fields";

import type {
  PublicFormField as Field,
  PublicEventProduct,
} from "../../../events/schemas/public.eventDetailBySlug.schema";
import type { EventFormFieldUI } from "@shared/models/db/db.eventFormFields.schema";

import {
  buildGroupedFieldSections,
  buildTouchedMapForAllFields,
  computeAttendeeErrors,
  draftToSlots,
  markTouched,
  slotsToDraft,
  type PublicAttendeeDraft,
  type TouchedMap,
} from "./eventAttendeesPage.logic";

type Draft = ReturnType<typeof loadDraft>;

type FieldGroup = {
  id: string;
  label: string;
  description?: string | null;
  sortOrder?: number | null;
};

type PublicEventDetailData = {
  products?: PublicEventProduct[] | null;
  formFields?: Field[] | null;
  formFieldsGroups?: FieldGroup[] | null;
};

type Params = {
  orgSlug?: string;
  eventSlug?: string;
  data?: PublicEventDetailData | null;
  navigate: NavigateFunction;
};

export function useEventAttendeesPage({
  orgSlug,
  eventSlug,
  data,
  navigate,
}: Params) {
  const [draft, setDraft] = useState<Draft | null>(() => {
    if (!orgSlug || !eventSlug) return null;
    return loadDraft(orgSlug, eventSlug);
  });

  const [attTouchedState, setAttTouchedState] = useState<{
    shapeKey: string;
    value: TouchedMap;
  }>({
    shapeKey: "",
    value: {},
  });

  const [attemptedNextState, setAttemptedNextState] = useState<{
    shapeKey: string;
    value: boolean;
  }>({
    shapeKey: "",
    value: false,
  });

  function persist(next: Draft) {
    setDraft(next);
    saveDraft(next);
  }

  const quantities = useMemo<Record<string, number>>(() => {
    return draft?.quantities ?? {};
  }, [draft?.quantities]);

  const sortedProducts = useMemo<PublicEventProduct[]>(() => {
    return sortProducts(data?.products ?? []);
  }, [data?.products]);

  const items = useMemo(() => {
    return quantitiesToItems(quantities);
  }, [quantities]);

  const totalTickets = useMemo(() => {
    return sumItemQuantities(items);
  }, [items]);

  const totalCents = useMemo(() => {
    return computeTotalCents(items, sortedProducts);
  }, [items, sortedProducts]);

  const currency = useMemo(() => {
    return resolveCurrency(sortedProducts);
  }, [sortedProducts]);

  const sortedFields = useMemo<Field[]>(() => {
    return sortFields<Field>(data?.formFields ?? []);
  }, [data?.formFields]);

  const sortedFieldGroups = useMemo<FieldGroup[]>(() => {
    return [...(data?.formFieldsGroups ?? [])].sort(
      (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
    );
  }, [data?.formFieldsGroups]);

  const groupedFieldSections = useMemo(() => {
    return buildGroupedFieldSections(sortedFields, sortedFieldGroups);
  }, [sortedFields, sortedFieldGroups]);

  const expectedSlots = useMemo(() => {
    return computeExpectedAttendeeSlots(sortedProducts, quantities);
  }, [sortedProducts, quantities]);

  const attendeesCount = expectedSlots.length;

  const draftAttendees = useMemo<PublicAttendeeDraft[]>(() => {
    return (draft?.attendees ?? []) as PublicAttendeeDraft[];
  }, [draft?.attendees]);

  const rawSlots = useMemo(() => {
    return draftToSlots(draftAttendees);
  }, [draftAttendees]);

  const slots = useMemo(() => {
    return reconcileAttendeesByIndex(rawSlots, expectedSlots);
  }, [rawSlots, expectedSlots]);

  const slotsShapeKey = useMemo(() => {
    return slots.map((s) => s.eventProductId).join("|");
  }, [slots]);

  const attTouched =
    attTouchedState.shapeKey === slotsShapeKey ? attTouchedState.value : {};

  const attemptedNext =
    attemptedNextState.shapeKey === slotsShapeKey
      ? attemptedNextState.value
      : false;

  function setAnswer(
    attIndex: number,
    fieldKey: string,
    value: unknown,
    opts?: { touch?: boolean }
  ) {
    if (!draft) return;

    const nextSlots = slots.map((a, i) =>
      i === attIndex ? { ...a, values: { ...a.values, [fieldKey]: value } } : a
    );

    if (opts?.touch) {
      setAttTouchedState((prev) => ({
        shapeKey: slotsShapeKey,
        value: markTouched(
          prev.shapeKey === slotsShapeKey ? prev.value : {},
          attIndex,
          fieldKey
        ),
      }));
    }

    persist({
      ...draft,
      attendees: slotsToDraft(nextSlots),
      acceptedTerms: false,
    });
  }

  function touchField(attIndex: number, fieldKey: string) {
    setAttTouchedState((prev) => ({
      shapeKey: slotsShapeKey,
      value: markTouched(
        prev.shapeKey === slotsShapeKey ? prev.value : {},
        attIndex,
        fieldKey
      ),
    }));
  }

  function touchAllFields() {
    setAttTouchedState({
      shapeKey: slotsShapeKey,
      value: buildTouchedMapForAllFields(slots.length, sortedFields),
    });
  }

  const attendeeErrors = useMemo<Array<Record<string, string>>>(() => {
    return slots.map((slot) =>
      computeAttendeeErrors(sortedFields, slot?.values ?? {})
    );
  }, [slots, sortedFields]);

  const allValid = useMemo(() => {
    if (attendeesCount === 0) return true;
    if (sortedFields.length === 0) return true;

    return areAllAttendeesValid(
      slots,
      sortedFields,
      (field: EventFormFieldUI, values: Record<string, unknown>) =>
        isFieldFilled(field, values)
    );
  }, [slots, attendeesCount, sortedFields]);

  function goBack() {
    if (!orgSlug || !eventSlug) return;
    navigate(`/o/${orgSlug}/e/${eventSlug}/billets`);
  }

  function goNext() {
    if (!orgSlug || !eventSlug) return;

    setAttemptedNextState({
      shapeKey: slotsShapeKey,
      value: true,
    });

    touchAllFields();

    if (!allValid) return;

    if (draft) {
      persist({
        ...draft,
        attendees: slotsToDraft(slots),
        acceptedTerms: false,
      });
    }

    navigate(`/o/${orgSlug}/e/${eventSlug}/paiement`);
  }

  return {
    draft,
    attTouched,
    attemptedNext,
    totalTickets,
    totalCents,
    currency,
    attendeesCount,
    sortedFields,
    groupedFieldSections,
    slots,
    attendeeErrors,
    allValid,
    setAnswer,
    touchField,
    goBack,
    goNext,
  };
}