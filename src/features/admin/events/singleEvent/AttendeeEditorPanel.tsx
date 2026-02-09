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
 * Construit le payload attendu par la RPC
 * + garde value brut pour le patch local
 */
function buildAttendeePayload(params: {
  fields: RegistrationFieldLike[];
  value: AttendeeEditorValue;
}) {
  const { fields, value } = params;

  const attendee: any = {};
  const answers: any[] = [];

  const reservedKeys = new Set(["email", "phone", "first_name", "last_name"]);

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
    else if (key === "first_name") attendee.firstName = String(raw ?? "").trim();
    else if (key === "last_name") attendee.lastName = String(raw ?? "").trim();

    if (!reservedKeys.has(key)) {
      if (type === "checkbox") answers.push({ fieldKey: key, valueBool: Boolean(raw) });
      else if (type === "number") answers.push({ fieldKey: key, valueInt: clampInt(raw, 0) });
      else if (type === "date") answers.push({ fieldKey: key, valueDate: String(raw ?? "").trim() });
      else answers.push({ fieldKey: key, valueText: String(raw ?? "").trim() });
    }
  }

  if (answers.length) attendee.answers = answers;

  return { attendee, rawValue: value };
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

  /** ⬅️ enrichi pour patch local */
  onAdded?: (res: {
    attendeeId: string;
    orderId: string;
    eventProductId: string;
    value: AttendeeEditorValue;
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
      }));
  }, [products]);

  const [selectedTicketId, setSelectedTicketId] = useState<string>(() => ticketOptions?.[0]?.id ?? "");

  useEffect(() => {
    setSelectedTicketId((prev) => {
      if (prev && ticketOptions.some((t) => t.id === prev)) return prev;
      return ticketOptions?.[0]?.id ?? "";
    });
  }, [ticketOptions.map((t) => t.id).join("|")]);

  /* -------------------- FORM STATE -------------------- */

  const [value, setValue] = useState<AttendeeEditorValue>({ ...(initialValue ?? {}) });

  useEffect(() => {
    const next = { ...(initialValue ?? {}) };
    for (const f of normalizedFields) {
      const key = String(f.fieldKey ?? "").trim();
      if (key && next[key] === undefined) next[key] = "";
    }
    setValue(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedFields.map((f) => String(f.fieldKey ?? "")).join("|"), isOpen]);

  function setField(key: string, v: any) {
    setValue((prev) => ({ ...prev, [key]: v }));
  }

  function isRequired(f: RegistrationFieldLike) {
    return Boolean(f.isRequired ?? false);
  }

  function isValid() {
    if (mode === "create") {
      if (!orderId || !selectedTicketId) return false;
    }
    for (const f of normalizedFields) {
      const key = String(f.fieldKey ?? "").trim();
      if (!key || !isRequired(f)) continue;
      const v = value[key];
      if (f.fieldType === "checkbox") {
        if (!Boolean(v)) return false;
      } else if (String(v ?? "").trim().length === 0) {
        return false;
      }
    }
    return true;
  }

  const saving = mode === "create" ? addHook.loading : isSaving;
  const error = mode === "create" ? addHook.error : externalError;

  /* -------------------- SUBMIT -------------------- */

  async function handleSubmit() {
    if (saving) return;

    if (mode === "create") {
      if (!orderId) return;

      const { attendee, rawValue } = buildAttendeePayload({
        fields: normalizedFields,
        value,
      });

      const res = await addHook.addOrderAttendee({
        orderId,
        eventProductId: selectedTicketId,
        attendee,
        markPaid: false,
      });

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

    await onSubmit(value);
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
              <div>
                <div className="adminTicketsEditorTitle">
                  {mode === "create" ? "Ajouter un participant" : "Modifier participant"}
                </div>
                <div className="adminEventHint">
                  Le formulaire s’adapte automatiquement aux champs configurés dans “Formulaire d’inscription”.
                </div>
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
                          checked={Boolean(value[key])}
                          onChange={(e) => setField(key, e.target.checked)}
                          disabled={saving}
                        />
                        <span>{Boolean(value[key]) ? "Oui" : "Non"}</span>
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
                        value={String(value[key] ?? "")}
                        onChange={(e) => setField(key, e.target.value)}
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
                        value={String(value[key] ?? "")}
                        onChange={(e) => setField(key, e.target.value)}
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
                      value={String(value[key] ?? "")}
                      onChange={(e) =>
                        type === "number"
                          ? setField(key, e.target.value === "" ? "" : clampInt(e.target.value))
                          : setField(key, e.target.value)
                      }
                      disabled={saving}
                    />
                  </div>
                );
              })}
            </div>

            <div className="adminTicketsEditorFooter">
              <Button variant="primary" onClick={handleSubmit} disabled={!isValid() || saving}>
                {saving ? "Enregistrement…" : mode === "create" ? "Ajouter" : "Mettre à jour"}
              </Button>
            </div>
          </div>
        ) : null
      }
    />
  );
}
