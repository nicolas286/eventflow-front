import { useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Button, EditorShell } from "../../../../ui/components";
import { useAdminAddOrderAttendee } from "../../hooks/useAddOrderAttendee";

/* -------------------- TYPES -------------------- */

type FieldType =
  | "text"
  | "textarea"
  | "email"
  | "number"
  | "select"
  | "checkbox"
  | "radio"
  | "date"
  | "country"
  | "phone";

type FieldOption = { label: string; value: string };

export type RegistrationFieldLike = {
  id?: string | null;
  fieldKey?: string | null;
  label?: string | null;
  fieldType?: FieldType | null;
  isRequired?: boolean | null;
  isActive?: boolean | null;
  sortOrder?: number | null;
  options?: FieldOption[] | string | null;
};

export type AttendeeEditorMode = "create" | "edit";
export type AttendeeEditorValue = Record<string, any>;

/** ⚠️ type light */
export type TicketProductLike = {
  id: string;
  name?: string | null;
  createsAttendees?: boolean | null;
  attendeesPerUnit?: number | null; // ✅ important pour le wizard
  isActive?: boolean | null;
};

/* -------------------- HELPERS -------------------- */

function clampInt(v: unknown, fallback = 0) {
  const n = typeof v === "number" ? v : Number(String(v ?? ""));
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

function toOptions(value: any): FieldOption[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((o: any) => ({
        label: String(o?.label ?? o?.value ?? "").trim(),
        value: String(o?.value ?? o?.label ?? "").trim(),
      }))
      .filter((o) => o.label && o.value);
  }
  if (typeof value === "string") {
    return value
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean)
      .map((label) => ({ label, value: label }));
  }
  return [];
}

function normalizeFields(fields: RegistrationFieldLike[]) {
  const arr = Array.isArray(fields) ? [...fields] : [];
  arr.sort((a, b) => clampInt(a.sortOrder ?? 0) - clampInt(b.sortOrder ?? 0));
  return arr.filter((f) => {
    const key = String(f.fieldKey ?? "").trim();
    const active = Boolean(f.isActive ?? true);
    return key && active;
  });
}

function inputTypeFor(fieldType: FieldType) {
  if (fieldType === "email") return "email";
  if (fieldType === "number") return "number";
  if (fieldType === "date") return "date";
  return "text";
}

/**
 * ✅ IMPORTANT
 * - `camelToSnake()` ne transforme pas la valeur d'une string.
 * - Ici, `fieldKey` (ex: "lastName") doit devenir "last_name" AVANT d'être envoyé à la RPC.
 */
function toSnakeKey(key: string) {
  const k = String(key ?? "").trim();
  if (!k) return "";
  if (k === "firstName") return "first_name";
  if (k === "lastName") return "last_name";
  return k.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
}

function buildAttendeePayload(params: {
  fields: RegistrationFieldLike[];
  value: AttendeeEditorValue;
}) {
  const { fields, value } = params;

  const attendee: any = {};
  const answers: any[] = [];

  const reservedKeys = new Set([
    "email",
    "phone",
    "first_name",
    "last_name",
    "firstName",
    "lastName",
  ]);

  for (const f of fields) {
    const key = String(f.fieldKey ?? "").trim();
    if (!key) continue;

    const type = (f.fieldType ?? "text") as FieldType;
    const raw = value[key];

    const isEmpty =
      type === "checkbox" ? false : String(raw ?? "").trim().length === 0;
    if (isEmpty) continue;

    if (key === "email") attendee.email = String(raw ?? "").trim();
    else if (key === "phone") attendee.phone = String(raw ?? "").trim();
    else if (key === "first_name" || key === "firstName")
      attendee.firstName = String(raw ?? "").trim();
    else if (key === "last_name" || key === "lastName")
      attendee.lastName = String(raw ?? "").trim();

    if (!reservedKeys.has(key)) {
      const normalizedFieldKey = toSnakeKey(key);

      if (type === "checkbox")
        answers.push({ fieldKey: normalizedFieldKey, valueBool: Boolean(raw) });
      else if (type === "number")
        answers.push({ fieldKey: normalizedFieldKey, valueInt: clampInt(raw, 0) });
      else if (type === "date")
        answers.push({ fieldKey: normalizedFieldKey, valueDate: String(raw ?? "").trim() });
      else
        answers.push({ fieldKey: normalizedFieldKey, valueText: String(raw ?? "").trim() });
    }
  }

  if (answers.length) attendee.answers = answers;

  return { attendee, rawValue: value };
}

function makeEmptyFormValue(fields: RegistrationFieldLike[], initialValue?: AttendeeEditorValue) {
  const next = { ...(initialValue ?? {}) };
  for (const f of fields) {
    const key = String(f.fieldKey ?? "").trim();
    if (key && next[key] === undefined) next[key] = "";
  }
  return next;
}

/* -------------------- COMPONENT -------------------- */

export function AttendeeEditorPanel(props: {
  supabase: SupabaseClient;

  isOpen: boolean;
  mode: AttendeeEditorMode;

  orderId?: string | null;
  products: TicketProductLike[];

  fields: RegistrationFieldLike[];
  initialValue: AttendeeEditorValue;

  onRequestClose: () => void;
  onSubmit: (value: AttendeeEditorValue) => Promise<void> | void;

  isSaving?: boolean;
  stickyTop?: number;
  editorWidth?: number;
  editorGap?: number;

  error?: string | null;
  left: React.ReactNode;

  onAdded?: (res: {
    attendeeId: string;
    orderId: string;
    eventProductId: string;
    value: AttendeeEditorValue;
  }) => void;

  /** ✅ optionnel: si tu veux patch local en bulk côté parent plus tard */
  onAddedBulk?: (res: {
    attendeeIds: string[];
    orderId: string;
    eventProductId: string;
    values: AttendeeEditorValue[];
  }) => void;
}) {
  const {
    supabase,
    isOpen,
    mode,
    orderId,
    products,
    fields,
    initialValue,
    onRequestClose,
    onSubmit,
    isSaving = false,
    stickyTop = 84,
    editorWidth = 420,
    editorGap = 14,
    error: externalError = null,
    left,
    onAdded,
    onAddedBulk,
  } = props;

  const normalizedFields = useMemo(() => normalizeFields(fields), [fields]);
  const addHook = useAdminAddOrderAttendee({ supabase });

  /* -------------------- TICKETS -------------------- */

  const ticketOptions = useMemo(() => {
    return (Array.isArray(products) ? products : [])
      .filter((p) => Boolean(p?.isActive ?? true))
      .filter((p) => Boolean(p?.createsAttendees ?? true))
      .map((p) => ({
        id: String(p.id),
        name: String(p?.name ?? "Ticket").trim() || "Ticket",
        attendeesPerUnit: clampInt(p?.attendeesPerUnit ?? 1, 1),
      }));
  }, [products]);

  const [selectedTicketId, setSelectedTicketId] = useState<string>(() => ticketOptions?.[0]?.id ?? "");

  useEffect(() => {
    setSelectedTicketId((prev) => {
      if (prev && ticketOptions.some((t) => t.id === prev)) return prev;
      return ticketOptions?.[0]?.id ?? "";
    });
  }, [ticketOptions.map((t) => t.id).join("|")]);

  const selectedTicket = useMemo(
    () => ticketOptions.find((t) => t.id === selectedTicketId) ?? null,
    [ticketOptions, selectedTicketId]
  );

  const pageCount = useMemo(() => {
    if (mode !== "create") return 1;
    return Math.max(1, clampInt(selectedTicket?.attendeesPerUnit ?? 1, 1));
  }, [mode, selectedTicket?.attendeesPerUnit]);

  /* -------------------- WIZARD STATE (create only) -------------------- */

  const [pageIndex, setPageIndex] = useState(0);

  // drafts : une value par page
  const [draftPages, setDraftPages] = useState<AttendeeEditorValue[]>([]);

  // (edit) fallback single state
  const [value, setValue] = useState<AttendeeEditorValue>({ ...(initialValue ?? {}) });

  // reset quand on ouvre / change ticket / change fields
  useEffect(() => {
    if (!isOpen) return;

    // edit mode: un seul form
    if (mode !== "create") {
      setPageIndex(0);
      setValue(makeEmptyFormValue(normalizedFields, initialValue));
      return;
    }

    // create mode: initialise pages
    setPageIndex(0);

    setDraftPages((prev) => {
      const next: AttendeeEditorValue[] = [];

      for (let i = 0; i < pageCount; i++) {
        // page 0 peut récupérer initialValue si tu veux (souvent vide anyway)
        const base = i === 0 ? (initialValue ?? {}) : {};
        const existing = prev[i];
        next.push(makeEmptyFormValue(normalizedFields, existing ?? base));
      }

      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mode, pageCount, normalizedFields.map((f) => String(f.fieldKey ?? "")).join("|"), selectedTicketId]);

  const currentValue = useMemo(() => {
    if (mode !== "create") return value;
    return draftPages[pageIndex] ?? makeEmptyFormValue(normalizedFields, {});
  }, [mode, value, draftPages, pageIndex, normalizedFields]);

  function setCurrentField(key: string, v: any) {
    if (mode !== "create") {
      setValue((prev) => ({ ...prev, [key]: v }));
      return;
    }
    setDraftPages((prev) => {
      const copy = [...prev];
      const page = { ...(copy[pageIndex] ?? {}) };
      page[key] = v;
      copy[pageIndex] = page;
      return copy;
    });
  }

  function isRequired(f: RegistrationFieldLike) {
    return Boolean(f.isRequired ?? false);
  }

  function isValidOne(v: AttendeeEditorValue) {
    if (mode === "create") {
      if (!orderId || !selectedTicketId) return false;
    }
    for (const f of normalizedFields) {
      const key = String(f.fieldKey ?? "").trim();
      if (!key || !isRequired(f)) continue;

      const vv = v[key];
      if (f.fieldType === "checkbox") {
        if (!Boolean(vv)) return false;
      } else if (String(vv ?? "").trim().length === 0) {
        return false;
      }
    }
    return true;
  }

  const canGoPrev = mode === "create" && pageIndex > 0;
  const canGoNext = mode === "create" && pageIndex < pageCount - 1;

  const saving = mode === "create" ? addHook.loading : isSaving;
  const error = mode === "create" ? addHook.error : externalError;

  /* -------------------- SUBMIT -------------------- */

  async function handleSubmit() {
    if (saving) return;

    if (mode === "create") {
      if (!orderId) return;

      // on force validation page courante avant next/final
      if (!isValidOne(currentValue)) return;

      // wizard flow
      if (canGoNext) {
        setPageIndex((p) => Math.min(pageCount - 1, p + 1));
        return;
      }

      // final submit (bulk si pageCount > 1)
      const values = (draftPages.length ? draftPages : [currentValue]).slice(0, pageCount);

      // garde-fou: toutes les pages valides
      for (let i = 0; i < values.length; i++) {
        if (!isValidOne(values[i])) {
          setPageIndex(i);
          return;
        }
      }

      const attendeesPayload = values.map((v) => buildAttendeePayload({ fields: normalizedFields, value: v }).attendee);

      // ✅ tentative bulk (si ton schema/repo le supporte)
      // - si ça throw, on fallback loop
      try {
        if (attendeesPayload.length <= 1) {
          const { rawValue } = buildAttendeePayload({ fields: normalizedFields, value: values[0] });
          const res = await addHook.addOrderAttendee({
            orderId,
            eventProductId: selectedTicketId,
            attendee: attendeesPayload[0],
            markPaid: false,
          } as any);

          if (res?.attendeeId) {
            onAdded?.({
              attendeeId: res.attendeeId,
              orderId,
              eventProductId: selectedTicketId,
              value: rawValue,
            });
            onRequestClose();
          }
          return;
        }

        // bulk: on envoie attendees[]
        // ⚠️ adapte le nom du champ si besoin
        const bulkRes: any = await addHook.addOrderAttendee({
          orderId,
          eventProductId: selectedTicketId,
          attendees: attendeesPayload,
          markPaid: false,
        } as any);

        // si ton backend renvoie une liste d’ids
        const attendeeIds: string[] =
          Array.isArray(bulkRes?.attendeeIds) ? bulkRes.attendeeIds :
          Array.isArray(bulkRes?.attendee_ids) ? bulkRes.attendee_ids :
          [];

        if (attendeeIds.length) {
          onAddedBulk?.({
            attendeeIds,
            orderId,
            eventProductId: selectedTicketId,
            values,
          });
          onRequestClose();
          return;
        }

        // si bulk renvoie juste 1 id (fallback)
        if (bulkRes?.attendeeId) {
          onAdded?.({
            attendeeId: bulkRes.attendeeId,
            orderId,
            eventProductId: selectedTicketId,
            value: values[0],
          });
          onRequestClose();
          return;
        }

        // sinon on considère que c’est ok et on ferme
        onRequestClose();
        return;
      } catch {
        // fallback loop (N fois la RPC single)
      }

      // ✅ fallback loop
      const createdIds: string[] = [];
      for (let i = 0; i < attendeesPayload.length; i++) {
        const { rawValue } = buildAttendeePayload({ fields: normalizedFields, value: values[i] });

        const r = await addHook.addOrderAttendee({
          orderId,
          eventProductId: selectedTicketId,
          attendee: attendeesPayload[i],
          markPaid: false,
        } as any);

        if (r?.attendeeId) {
          createdIds.push(r.attendeeId);
          onAdded?.({
            attendeeId: r.attendeeId,
            orderId,
            eventProductId: selectedTicketId,
            value: rawValue,
          });
        }
      }

      if (createdIds.length && typeof onAddedBulk === "function") {
        onAddedBulk({
          attendeeIds: createdIds,
          orderId,
          eventProductId: selectedTicketId,
          values,
        });
      }

      onRequestClose();
      return;
    }

    // edit flow => parent gère l’update via onSubmit
    await onSubmit(value);
  }

  function handlePrev() {
    if (!canGoPrev || saving) return;
    setPageIndex((p) => Math.max(0, p - 1));
  }

  /* -------------------- RENDER -------------------- */

  return (
    <EditorShell
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      editorWidth={editorWidth}
      editorGap={editorGap}
      stickyTop={stickyTop}
      left={left}
      right={
        isOpen ? (
          <div className="adminTicketsEditorCard">
            <div className="adminTicketsEditorHeader">
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div className="adminTicketsEditorTitle">
                    {mode === "create" ? "Ajouter un participant" : "Modifier participant"}
                  </div>
                  <div className="adminEventHint">
                    Le formulaire s’adapte automatiquement aux champs configurés dans “Formulaire d’inscription”.
                  </div>
                </div>

                {mode === "create" && pageCount > 1 ? (
                  <div className="adminEventHint" style={{ whiteSpace: "nowrap" }}>
                    Participant {pageIndex + 1}/{pageCount}
                  </div>
                ) : null}
              </div>
            </div>

            {error ? (
              <div className="adminEventHint" style={{ marginTop: 10, color: "#b91c1c" }}>
                {error}
              </div>
            ) : null}

            {mode === "create" ? (
              <div className="adminEventFormGrid" style={{ marginTop: 12 }}>
                <div className="adminEventField adminEventFieldSpan2">
                  <div className="adminEventLabel">Type de ticket *</div>
                  <select
                    className="adminEventInput"
                    value={selectedTicketId}
                    onChange={(e) => setSelectedTicketId(e.target.value)}
                    disabled={saving}
                  >
                    <option value="">—</option>
                    {ticketOptions.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                        {t.attendeesPerUnit > 1 ? ` (x${t.attendeesPerUnit})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : null}

            <div className="adminEventFormGrid" style={{ marginTop: 12 }}>
              {normalizedFields.map((f) => {
                const key = String(f.fieldKey ?? "").trim();
                if (!key) return null;

                const label = String(f.label ?? key).trim();
                const type = (f.fieldType ?? "text") as FieldType;
                const req = isRequired(f);
                const options = toOptions(f.options);

                if (type === "checkbox") {
                  return (
                    <div key={key} className="adminEventField">
                      <div className="adminEventLabel">
                        {label} {req ? "*" : ""}
                      </div>
                      <label className="adminEventToggle">
                        <input
                          type="checkbox"
                          checked={Boolean(currentValue[key])}
                          onChange={(e) => setCurrentField(key, e.target.checked)}
                          disabled={saving}
                        />
                        <span>{Boolean(currentValue[key]) ? "Oui" : "Non"}</span>
                      </label>
                    </div>
                  );
                }

                if (type === "select" || type === "radio") {
                  return (
                    <div key={key} className="adminEventField adminEventFieldSpan2">
                      <div className="adminEventLabel">
                        {label} {req ? "*" : ""}
                      </div>
                      <select
                        className="adminEventInput"
                        value={String(currentValue[key] ?? "")}
                        onChange={(e) => setCurrentField(key, e.target.value)}
                        disabled={saving}
                      >
                        <option value="">—</option>
                        {options.map((o) => (
                          <option key={`${key}:${o.value}`} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                }

                if (type === "textarea") {
                  return (
                    <div key={key} className="adminEventField adminEventFieldSpan2">
                      <div className="adminEventLabel">
                        {label} {req ? "*" : ""}
                      </div>
                      <textarea
                        className="adminEventTextarea"
                        value={String(currentValue[key] ?? "")}
                        onChange={(e) => setCurrentField(key, e.target.value)}
                        disabled={saving}
                      />
                    </div>
                  );
                }

                return (
                  <div key={key} className="adminEventField">
                    <div className="adminEventLabel">
                      {label} {req ? "*" : ""}
                    </div>
                    <input
                      className="adminEventInput"
                      type={inputTypeFor(type)}
                      value={String(currentValue[key] ?? "")}
                      onChange={(e) =>
                        type === "number"
                          ? setCurrentField(key, e.target.value === "" ? "" : clampInt(e.target.value))
                          : setCurrentField(key, e.target.value)
                      }
                      disabled={saving}
                    />
                  </div>
                );
              })}
            </div>

            <div className="adminTicketsEditorFooter" style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              {mode === "create" && pageCount > 1 ? (
                <Button variant="ghost" onClick={handlePrev} disabled={!canGoPrev || saving}>
                  Précédent
                </Button>
              ) : (
                <span />
              )}

              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={!isValidOne(currentValue) || saving}
              >
                {saving
                  ? "Enregistrement…"
                  : mode === "create"
                  ? (pageCount > 1
                      ? (canGoNext ? "Suivant" : `Ajouter ${pageCount} participants`)
                      : "Ajouter")
                  : "Mettre à jour"}
              </Button>
            </div>
          </div>
        ) : null
      }
    />
  );
}
