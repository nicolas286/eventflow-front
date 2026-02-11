import { useEffect, useMemo, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Button, EditorShell } from "../../../../ui/components";

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
  attendeesPerUnit?: number | null;
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

function makeEmptyFormValue(fields: RegistrationFieldLike[], initialValue?: AttendeeEditorValue) {
  const next = { ...(initialValue ?? {}) };
  for (const f of fields) {
    const key = String(f.fieldKey ?? "").trim();
    if (key && next[key] === undefined) next[key] = "";
  }
  return next;
}

/* -------------------- COMPONENT -------------------- */

type AnimState = "closed" | "open" | "closing";

export function AttendeeEditorPanel(props: {
  supabase: SupabaseClient;

  isOpen: boolean;
  mode: AttendeeEditorMode;

  /** ✅ encore présent pour compat, mais plus utilisé pour create */
  orderId?: string | null;
  /** ✅ encore présent pour compat, mais plus utilisé pour create */
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
  left?: React.ReactNode;

  /** ✅ nouveau: "shell" (desktop) ou "inline" (mobile sous la card) */
  layout?: "shell" | "inline";

  /** ❌ deprecated: on ne crée plus d'attendee dans ce panel */
  onAdded?: (res: {
    attendeeId: string;
    orderId: string;
    eventProductId: string;
    value: AttendeeEditorValue;
  }) => void;

  /** ❌ deprecated: on ne crée plus d'attendee dans ce panel */
  onAddedBulk?: (res: {
    attendeeIds: string[];
    orderId: string;
    eventProductId: string;
    values: AttendeeEditorValue[];
  }) => void;
}) {
  const {
    // supabase, // plus utilisé ici (panel edit only)
    isOpen,
    mode,
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
    layout = "shell",
  } = props;

  const normalizedFields = useMemo(() => normalizeFields(fields), [fields]);

  /* -------------------- STATE -------------------- */

  const [value, setValue] = useState<AttendeeEditorValue>({ ...(initialValue ?? {}) });

  useEffect(() => {
    if (!isOpen) return;
    setValue(makeEmptyFormValue(normalizedFields, initialValue));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, normalizedFields.map((f) => String(f.fieldKey ?? "")).join("|")]);

  function setField(key: string, v: any) {
    setValue((prev) => ({ ...prev, [key]: v }));
  }

  function isRequired(f: RegistrationFieldLike) {
    return Boolean(f.isRequired ?? false);
  }

  function isValid(v: AttendeeEditorValue) {
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

  const saving = Boolean(isSaving);
  const error = externalError;

  /* -------------------- SUBMIT -------------------- */

  async function handleSubmit() {
    await onSubmit(value);
  }

  /* -------------------- INLINE ANIMATION -------------------- */

  const [anim, setAnim] = useState<AnimState>("closed");
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (layout !== "inline") return;

    if (isOpen) {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
      setAnim("open");
      return;
    }

    if (anim === "open") {
      setAnim("closing");
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = window.setTimeout(() => {
        setAnim("closed");
        closeTimerRef.current = null;
      }, 180);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, layout]);

  /* -------------------- RENDER: CONTENT -------------------- */

  const panelContent =
    mode !== "edit" ? (
      <div style={{ marginTop: 14 }}>
        <Button variant="primary" onClick={onRequestClose}>
          Fermer
        </Button>
      </div>
    ) : (
      <>
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

        <div
          className="adminTicketsEditorFooter"
          style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}
        >
          <Button variant="secondary" onClick={onRequestClose} disabled={saving}>
            Fermer
          </Button>

          <Button variant="primary" onClick={handleSubmit} disabled={!isValid(value) || saving}>
            {saving ? "Enregistrement…" : "Mettre à jour"}
          </Button>
        </div>
      </>
    );

  const card = (
    <div
      className={[
        "adminTicketsEditorCard",
        layout === "inline" ? "adminInlineEditorPanel" : "",
        layout === "inline" && anim === "open" ? "isOpen" : "",
        layout === "inline" && anim === "closing" ? "isClosing" : "",
      ].join(" ")}
    >
      <div className="adminTicketsEditorHeader">
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div className="adminTicketsEditorTitle">
              {mode === "edit" ? "Modifier participant" : "Création de participant désactivée"}
            </div>
            <div className="adminEventHint">
              {mode === "edit"
                ? "Le formulaire s’adapte automatiquement aux champs configurés dans “Formulaire d’inscription”."
                : "Les participants sont générés automatiquement via les tickets de la commande. Crée une commande pour ajouter des participants."}
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="adminEventHint" style={{ marginTop: 10, color: "#b91c1c" }}>
          {error}
        </div>
      ) : null}

      {panelContent}
    </div>
  );

  /* -------------------- RENDER: LAYOUTS -------------------- */

  // ✅ INLINE : juste la card (affichée sous la personne en mobile)
  if (layout === "inline") {
    if (anim === "closed") return null;
    return card;
  }

  // ✅ DESKTOP : EditorShell
  return (
    <EditorShell
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      editorWidth={editorWidth}
      editorGap={editorGap}
      stickyTop={stickyTop}
      left={left}
      right={isOpen ? card : null}
    />
  );
}
