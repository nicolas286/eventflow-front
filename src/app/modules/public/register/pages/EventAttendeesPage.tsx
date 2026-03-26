import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@gateways/supabase/supabaseClient";
import { usePublicEventDetail } from "../../events/hooks/usePublicEventDetail";

import Container from "@ui/components/container/Container";
import Card, { CardBody, CardHeader } from "@ui/components/card/Card";
import Button from "@ui/components/button/Button";
import Badge from "@ui/components/badge/Badge";
import CountrySelect from "@shared/ui/components/inputs/CountrySelect";
import PhoneInput from "@shared/ui/components/inputs/PhoneInput";
import { PublicEventHeader } from "../components/PublicEventHeader";
import { loadDraft, saveDraft } from "../helpers/checkoutStore";
import { PublicStickyCheckoutBar } from "../components/PublicStickyCheckoutBar/PublicStickyCheckoutBar";
import {
  computeTotalCents,
  quantitiesToItems,
  resolveCurrency,
  sumItemQuantities,
} from "@helpers/logic";

import type { PublicFormField as Field } from "../../events/schemas/public.eventDetailBySlug.schema";

import {
  isBirthDateField,
  isCountryField,
  isPhoneField,
  sortFields,
  isFieldFilled,
  areAllAttendeesValid,
} from "@helpers/fields";

import {
  sortProducts,
  computeExpectedAttendeeSlots,
  reconcileAttendeesByIndex,
} from "@helpers/logic";

import type { EventProduct } from "@shared/models/db/db.eventProducts.schema";
import { validateFieldValue } from "@shared/helpers/validateFieldValue";
import { getFieldKey } from "@shared/helpers/fields";

import "@app/layouts/publicCheckoutBase.desktop.css";
import "./EventAttendeesPage.desktop.css";
import "./eventAttendeesPage.mobile.css";
import type { EventFormFieldUI } from "@shared/models/db/db.eventFormFields.schema";
import { MessageBox } from "@ui/components/message/MessageBox";

/* ---------------- Types ---------------- */

type Draft = ReturnType<typeof loadDraft>;

type PublicAttendeeDraft = Record<string, unknown> & { eventProductId: string };

type AttendeeSlot = {
  eventProductId: string;
  values: Record<string, unknown>;
};

type TouchedMap = Record<number, Record<string, true>>;

/* ---------------- Helpers ---------------- */

function computeAttendeeErrors(fields: Field[], values: Record<string, unknown>) {
  const errs: Record<string, string> = {};
  for (const f of fields) {
    const key = getFieldKey(f) || String(f?.fieldKey ?? "").trim();
    if (!key) continue;

    const msg = validateFieldValue(f as EventFormFieldUI, values[key]);
    if (msg) errs[key] = msg;
  }
  return errs;
}

function draftToSlots(draftAtts: PublicAttendeeDraft[] | null | undefined): AttendeeSlot[] {
  return [...(draftAtts ?? [])].map((a) => {
    const { eventProductId, ...rest } = a;
    return { eventProductId, values: { ...rest } };
  });
}

function slotsToDraft(slots: AttendeeSlot[]): PublicAttendeeDraft[] {
  return slots.map((s) => ({ eventProductId: s.eventProductId, ...(s.values ?? {}) }));
}

function markTouched(prev: TouchedMap, attIndex: number, fieldKey: string): TouchedMap {
  const row = prev[attIndex] ?? {};
  if (row[fieldKey]) return prev;
  return { ...prev, [attIndex]: { ...row, [fieldKey]: true } };
}

/* ---------------- Page ---------------- */

export function EventAttendeesPage() {
  const navigate = useNavigate();
  const { orgSlug, eventSlug } = useParams<{ orgSlug: string; eventSlug: string }>();

  const { loading, error, data } = usePublicEventDetail({
    supabase,
    orgSlug,
    eventSlug,
  });

  const [draft, setDraft] = useState<Draft | null>(null);
  const [attTouched, setAttTouched] = useState<TouchedMap>({});
  const [attemptedNext, setAttemptedNext] = useState(false);

  useEffect(() => {
    if (!orgSlug || !eventSlug) return;
    setDraft(loadDraft(orgSlug, eventSlug));
  }, [orgSlug, eventSlug]);

  function persist(next: Draft) {
    setDraft(next);
    saveDraft(next);
  }

  const quantities = useMemo(() => {
    return draft?.quantities ?? {};
  }, [draft?.quantities]);

  const sortedProducts = useMemo(() => {
    return sortProducts((data?.products ?? []) as EventProduct[]);
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

  const sortedFields = useMemo(() => {
    return sortFields(data?.formFields ?? []);
  }, [data?.formFields]);

  const sortedFieldGroups = useMemo(() => {
  return [...(data?.formFieldsGroups ?? [])].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
  );
  }, [data?.formFieldsGroups]);

  const groupedFieldSections = useMemo(() => {
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
  }, [sortedFields, sortedFieldGroups]);

  const expectedSlots = useMemo(() => {
    return computeExpectedAttendeeSlots(sortedProducts, quantities);
  }, [sortedProducts, quantities]);

  const attendeesCount = expectedSlots.length;

  const draftAttendees = useMemo(() => {
    return (draft?.attendees ?? []) as PublicAttendeeDraft[];
  }, [draft?.attendees]);

  const slots = useMemo(() => {
    return draftToSlots(draftAttendees);
  }, [draftAttendees]);

  // reconcile slots vs expectedSlots (truth), persist dans draft (flat)
  useEffect(() => {
    if (!orgSlug || !eventSlug) return;
    if (!data) return;
    if (!draft) return;

    const reconciled = reconcileAttendeesByIndex(slots, expectedSlots);

    const same =
      reconciled.length === slots.length &&
      reconciled.every((a, i) => a.eventProductId === slots[i]?.eventProductId);

    if (same) return;

    // si le nombre de participants change, reset un peu le touched (sinon erreurs fantômes)
    setAttTouched({});
    setAttemptedNext(false);

    persist({
      ...draft,
      attendees: slotsToDraft(reconciled),
      acceptedTerms: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expectedSlots, data, orgSlug, eventSlug, draft, slots]);

  function setAnswer(attIndex: number, fieldKey: string, value: unknown, opts?: { touch?: boolean }) {
    if (!draft) return;

    const nextSlots = slots.map((a, i) =>
      i === attIndex ? { ...a, values: { ...a.values, [fieldKey]: value } } : a
    );

    if (opts?.touch) {
      setAttTouched((prev) => markTouched(prev, attIndex, fieldKey));
    }

    persist({
      ...draft,
      attendees: slotsToDraft(nextSlots),
      acceptedTerms: false,
    });
  }

  function touchAllFields() {
    const next: TouchedMap = {};
    for (let i = 0; i < slots.length; i++) {
      const row: Record<string, true> = {};
      for (const f of sortedFields) {
        const key = String(f.fieldKey ?? "").trim();
        if (key) row[key] = true;
      }
      next[i] = row;
    }
    setAttTouched(next);
  }

  const attendeeErrors = useMemo(() => {
    const errsByIndex: Array<Record<string, string>> = [];
    for (let i = 0; i < slots.length; i++) {
      errsByIndex[i] = computeAttendeeErrors(sortedFields, slots[i]?.values ?? {});
    }
    return errsByIndex;
  }, [slots, sortedFields]);

  const allValid = useMemo(() => {
    if (attendeesCount === 0) return true;
    if (sortedFields.length === 0) return true;

    return areAllAttendeesValid(
      slots,
      sortedFields,
      (field: EventFormFieldUI, values: Record<string, unknown>) => isFieldFilled(field, values)
    );
  }, [slots, attendeesCount, sortedFields]);

  function goBack() {
    if (!orgSlug || !eventSlug) return;
    navigate(`/o/${orgSlug}/e/${eventSlug}/billets`);
  }

  function goNext() {
    if (!orgSlug || !eventSlug) return;

    setAttemptedNext(true);
    touchAllFields();

    if (!allValid) return;

    navigate(`/o/${orgSlug}/e/${eventSlug}/paiement`);
  }

  function renderField(
  f: Field,
  idx: number,
  att: AttendeeSlot,
  rowErrs: Record<string, string>,
  rowTouched: Record<string, true>
) {
  const fieldKey = String(f.fieldKey ?? "").trim();
  const value = fieldKey ? att.values?.[fieldKey] : undefined;

  const errMsg = fieldKey ? rowErrs[fieldKey] : undefined;
  const showErr = !!errMsg && (attemptedNext || !!rowTouched[fieldKey]);

  const commonStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.10)",
    outline: "none",
  };

  const label = (
    <div style={{ fontWeight: 800, marginBottom: 6 }}>
      {f.label} {f.isRequired ? <span style={{ opacity: 0.7 }}>(requis)</span> : null}
    </div>
  );

  const errorLine = showErr ? <MessageBox variant="error">{errMsg}</MessageBox> : null;

  if (isBirthDateField(f as EventFormFieldUI)) {
    return (
      <div key={f.id}>
        {label}
        <input
          type="date"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => setAnswer(idx, fieldKey, e.target.value)}
          onBlur={() => setAttTouched((prev) => markTouched(prev, idx, fieldKey))}
          style={commonStyle}
        />
        {errorLine}
      </div>
    );
  }

  if (isCountryField(f as EventFormFieldUI)) {
    return (
      <div key={f.id}>
        {label}
        <CountrySelect
          value={typeof value === "string" ? value : ""}
          onChange={(v) => setAnswer(idx, fieldKey, v, { touch: true })}
          style={commonStyle}
          placeholder="Sélectionner un pays"
        />
        {errorLine}
      </div>
    );
  }

  if (isPhoneField(f as EventFormFieldUI)) {
    return (
      <div key={f.id}>
        {label}
        <PhoneInput
          value={typeof value === "string" ? value : ""}
          onChange={(v) => setAnswer(idx, fieldKey, v)}
          groupClassName="publicPhoneGroup"
          selectStyle={commonStyle}
          inputStyle={commonStyle}
          defaultDial="+32"
        />
        {errorLine}
      </div>
    );
  }

  if (f.fieldType === "textarea") {
    return (
      <div key={f.id}>
        {label}
        <textarea
          value={typeof value === "string" ? value : ""}
          onChange={(e) => setAnswer(idx, fieldKey, e.target.value)}
          onBlur={() => setAttTouched((prev) => markTouched(prev, idx, fieldKey))}
          style={{ ...commonStyle, minHeight: 90, resize: "vertical" }}
        />
        {errorLine}
      </div>
    );
  }

  if (f.fieldType === "select") {
    const opts = Array.isArray(f.options) ? f.options : [];
    return (
      <div key={f.id}>
        {label}
        <select
          value={typeof value === "string" ? value : ""}
          onChange={(e) => setAnswer(idx, fieldKey, e.target.value, { touch: true })}
          onBlur={() => setAttTouched((prev) => markTouched(prev, idx, fieldKey))}
          style={commonStyle}
        >
          <option value="">—</option>
          {opts.map((o: Record<string, string>, i: number) => (
            <option key={i} value={String(o.value ?? o)}>
              {String(o.label ?? o)}
            </option>
          ))}
        </select>
        {errorLine}
      </div>
    );
  }

  if (f.fieldType === "checkbox") {
    return (
      <div key={f.id}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input
            type="checkbox"
            checked={value === true}
            onChange={(e) => setAnswer(idx, fieldKey, e.target.checked, { touch: true })}
            style={{ width: 18, height: 18 }}
          />
          <div style={{ fontWeight: 800 }}>
            {f.label} {f.isRequired ? <span style={{ opacity: 0.7 }}>(requis)</span> : null}
          </div>
        </div>
        {errorLine}
      </div>
    );
  }

  const inputType =
    f.fieldType === "email"
      ? "email"
      : f.fieldType === "number"
        ? "number"
        : "text";

  return (
    <div key={f.id}>
      {label}
      <input
        type={inputType}
        value={
          inputType === "number"
            ? typeof value === "number"
              ? value
              : ""
            : typeof value === "string"
              ? value
              : ""
        }
        onChange={(e) =>
          setAnswer(
            idx,
            fieldKey,
            inputType === "number"
              ? e.target.value === ""
                ? ""
                : Number(e.target.value)
              : e.target.value
          )
        }
        onBlur={() => setAttTouched((prev) => markTouched(prev, idx, fieldKey))}
        style={commonStyle}
      />
      {errorLine}
    </div>
  );
}

  if (loading || !orgSlug || !eventSlug) {
    return (
      <div className="publicPage">
        <Container>Chargement…</Container>
      </div>
    );
  }

  if (error) {
    return (
      <div className="publicPage">
        <Container>Erreur : {error}</Container>
      </div>
    );
  }

  if (!data?.event) {
    return (
      <div className="publicPage">
        <Container>Événement introuvable.</Container>
      </div>
    );
  }

  const { org, event } = data;

  return (
    <div className="publicPage">
      <Container>
        <div className="publicSurface">
          <PublicEventHeader orgSlug={orgSlug} org={org} event={event} />

          <div className="publicDivider" />

          <div className="publicSectionTitle">2/3 — Participants</div>

          {totalTickets <= 0 ? (
            <div className="publicEmpty">Aucun billet sélectionné. Reviens à l’étape “Billets”.</div>
          ) : attendeesCount === 0 ? (
            <div className="publicEmpty">Aucun formulaire participant n’est requis pour ces billets.</div>
          ) : sortedFields.length === 0 ? (
            <div className="publicEmpty">Aucun champ configuré pour le formulaire.</div>
          ) : (
            <div className="publicGutter">
              <div className="publicList">
                {slots.map((att, idx) => {
                  const rowErrs = attendeeErrors[idx] ?? {};
                  const rowTouched = attTouched[idx] ?? {};

                  return (
                    <Card key={idx}>
                      <CardHeader
                        title={<div className="publicCardTitle">Participant {idx + 1}</div>}
                        right={
                          <Badge
                            tone="neutral"
                            label={sortedFields.some((f) => (f.isRequired ? true : false)) ? "Champs requis" : "Optionnel"}
                          />
                        }
                      />
                      <CardBody>
                        <div className="publicGroupedFields">
                            {groupedFieldSections.map((section) => (
                              <div
                                key={section.group?.id ?? "ungrouped"}
                                className="publicFieldGroupSection"
                              >
                                {section.group ? (
                                  <div className="publicFieldGroupHeader">
                                    <div className="publicFieldGroupTitle">{section.group.label}</div>

                                    {section.group.description ? (
                                      <div className="publicFieldGroupDescription">
                                        {section.group.description}
                                      </div>
                                    ) : null}
                                  </div>
                                ) : null}

                                <div className="publicGrid2">
                                  {section.fields.map((f) => renderField(f, idx, att, rowErrs, rowTouched))}
                                </div>
                              </div>
                            ))}
                        </div>
                      </CardBody>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          <div className="publicDivider" />

          <div style={{ display: "flex", justifyContent: "flex-start", gap: 12 }}>
            <Button variant="secondary" label="Retour aux billets" onClick={goBack} />
          </div>
        </div>
      </Container>

      <PublicStickyCheckoutBar
        amountCents={totalCents}
        currency={currency}
        primaryText={`${totalTickets} billet(s)`}
        secondaryText={`${attendeesCount} participant(s)`}
        onClick={goNext}
        disabled={totalTickets <= 0}
        ctaLabel="Continuer →"
      />
    </div>
  );
}

export default EventAttendeesPage;
