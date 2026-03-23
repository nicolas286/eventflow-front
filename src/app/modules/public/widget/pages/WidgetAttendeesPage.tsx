import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";

import { supabase } from "@gateways/supabase/supabaseClient";
import { usePublicEventDetail } from "../../events/hooks/usePublicEventDetail";
import { useWidgetTheme } from "../hooks/useWidgetTheme";

import { Button } from "@shared/ui/components";
import CountrySelect from "@shared/ui/components/inputs/CountrySelect";
import PhoneInput from "@shared/ui/components/inputs/PhoneInput";
import { MessageBox } from "@ui/components/message/MessageBox";

import { loadDraft, saveDraft } from "../../register/helpers/checkoutStore";

import type { PublicFormField as Field } from "../../events/schemas/public.eventDetailBySlug.schema";
import type { EventProduct } from "@shared/models/db/db.eventProducts.schema";
import type { EventFormFieldUI } from "@shared/models/db/db.eventFormFields.schema";
import { WidgetRoot } from "../components/WidgetRoot/WidgetRoot";

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

import { validateFieldValue } from "@shared/helpers/validateFieldValue";
import { getFieldKey } from "@shared/helpers/fields";

import "./WidgetAttendeesPage.css";
import { useWidgetAutoResize } from "../hooks/useWidgetAutoResize";
import { WidgetFooter } from "../components/WidgetFooter/WidgetFooter";
import { WidgetHeader } from "../components/WidgetHeader/WidgetHeader";

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

export function WidgetAttendeesPage() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const theme = useWidgetTheme();

  const { orgSlug, eventSlug } = useParams<{ orgSlug: string; eventSlug: string }>();

  const { loading, error, data } = usePublicEventDetail({
    supabase,
    orgSlug,
    eventSlug,
  });

  const [draft, setDraft] = useState<Draft | null>(null);
  const [attTouched, setAttTouched] = useState<TouchedMap>({});
  const [attemptedNext, setAttemptedNext] = useState(false);
  useWidgetAutoResize();

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

  const totalSelected = useMemo(() => {
    return Object.values(quantities).reduce((a, b) => a + (Number.isFinite(b) ? Number(b) : 0), 0);
  }, [quantities]);

  const sortedProducts = useMemo(() => {
    return sortProducts((data?.products ?? []) as EventProduct[]);
  }, [data?.products]);

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

  useEffect(() => {
    if (!orgSlug || !eventSlug) return;
    if (!data) return;
    if (!draft) return;

    const reconciled = reconcileAttendeesByIndex(slots, expectedSlots);

    const same =
      reconciled.length === slots.length &&
      reconciled.every((a, i) => a.eventProductId === slots[i]?.eventProductId);

    if (same) return;

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
    navigate(`/widget/o/${orgSlug}/e/${eventSlug}/billets${search}`);
  }

  function goNext() {
    if (!orgSlug || !eventSlug) return;

    setAttemptedNext(true);
    touchAllFields();

    if (!allValid) return;

    navigate(`/widget/o/${orgSlug}/e/${eventSlug}/paiement${search}`);
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
    border: "1px solid rgba(255,255,255,0.22)",
    outline: "none",
    background: "rgba(255,255,255,0.10)",
    color: "var(--widget-text)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
  };

  const label = (
    <div className="widgetFieldLabel">
      {f.label} {f.isRequired ? <span className="widgetFieldRequired">(requis)</span> : null}
    </div>
  );

  const errorLine = showErr ? <MessageBox variant="error">{errMsg}</MessageBox> : null;

  if (isBirthDateField(f as EventFormFieldUI)) {
    return (
      <div key={f.id} className="widgetFieldBlock">
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
      <div key={f.id} className="widgetFieldBlock">
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
      <div key={f.id} className="widgetFieldBlock">
        {label}
        <PhoneInput
          value={typeof value === "string" ? value : ""}
          onChange={(v) => setAnswer(idx, fieldKey, v)}
          groupClassName="widgetPhoneGroup"
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
      <div key={f.id} className="widgetFieldBlock widgetFieldBlockFull">
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
      <div key={f.id} className="widgetFieldBlock">
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
      <div key={f.id} className="widgetFieldBlock widgetFieldBlockFull">
        <label className="widgetCheckboxRow">
          <input
            type="checkbox"
            checked={value === true}
            onChange={(e) => setAnswer(idx, fieldKey, e.target.checked, { touch: true })}
          />
          <span>
            {f.label} {f.isRequired ? <span className="widgetFieldRequired">(requis)</span> : null}
          </span>
        </label>
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
    <div key={f.id} className="widgetFieldBlock">
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
    return <div className="widgetRoot">Chargement…</div>;
  }

  if (error) {
    return <div className="widgetRoot">Erreur : {error}</div>;
  }

  if (!data?.event) {
    return <div className="widgetRoot">Événement introuvable</div>;
  }

  const { event } = data;

  return (
    <WidgetRoot theme={theme}>
      <WidgetHeader left={<Button className="widgetButton" variant="ghost" label="← Retour" onClick={goBack} />}
        title={event.title}/>

      

      {totalSelected <= 0 ? (
        <div className="widgetEmpty">Aucun billet sélectionné. Reviens à l’étape billets.</div>
      ) : attendeesCount === 0 ? (
        <div className="widgetEmpty">Aucun formulaire participant n’est requis pour ces billets.</div>
      ) : sortedFields.length === 0 ? (
        <div className="widgetEmpty">Aucun champ configuré pour le formulaire.</div>
      ) : (
        <div className="widgetAttendeeList">
          {slots.map((att, idx) => {
            const rowErrs = attendeeErrors[idx] ?? {};
            const rowTouched = attTouched[idx] ?? {};

            return (
              <div key={idx} className="widgetEventCard widgetAttendeeCard">
                <div className="widgetAttendeeCardHeader">
                  <div className="widgetEventTitle">Participant {idx + 1}</div>
                  <div className="widgetAttendeeBadge">
                    {sortedFields.some((f) => f.isRequired) ? "Champs requis" : "Optionnel"}
                  </div>
                </div>

               <div className="widgetGroupedFields">
                  {groupedFieldSections.map((section) => (
                    <div
                      key={section.group?.id ?? "ungrouped"}
                      className="widgetFieldGroupSection"
                    >
                      {section.group ? (
                        <div className="widgetFieldGroupTitle">{section.group.label}</div>
                      ) : null}

                      <div className="widgetFormGrid">
                        {section.fields.map((f) => renderField(f, idx, att, rowErrs, rowTouched))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="widgetRecap widgetRecapActions">
        <Button className="widgetButton" variant="secondary" label="Retour" onClick={goBack} />
        <Button className="widgetButton" label="Continuer" onClick={goNext} disabled={totalSelected <= 0 || !allValid} />
      </div>

      <WidgetFooter/>
    </WidgetRoot>
  );
}

export default WidgetAttendeesPage;