import { useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Button, EditorShell } from "../../../../ui/components";
import type { EventFormFieldUI } from "../../../../domain/models/db/db.eventFormFields.schema";
import { AttendeeFieldsForm } from "./AttendeeFieldForm";

export type AttendeeEditorMode = "create" | "edit";
export type AttendeeEditorValue = Record<string, any>;

export type TicketProductLike = {
  id: string;
  name?: string | null;
  createsAttendees?: boolean | null;
  attendeesPerUnit?: number | null;
  isActive?: boolean | null;
};

function makeEmptyFormValue(fields: EventFormFieldUI[], initialValue?: AttendeeEditorValue) {
  const next = { ...(initialValue ?? {}) };
  for (const f of fields) {
    const key = String(f.fieldKey ?? "").trim();
    if (key && next[key] === undefined) next[key] = "";
  }
  return next;
}

type AnimState = "closed" | "open" | "closing";

export function AttendeeEditorPanel(props: {
  supabase: SupabaseClient;

  isOpen: boolean;
  mode: AttendeeEditorMode;

  /** ✅ encore présent pour compat, mais plus utilisé pour create */
  orderId?: string | null;
  /** ✅ encore présent pour compat, mais plus utilisé pour create */
  products: TicketProductLike[];

  fields: EventFormFieldUI[];
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


  /* -------------------- STATE -------------------- */

  const [value, setValue] = useState<AttendeeEditorValue>({ ...(initialValue ?? {}) });

  useEffect(() => {
    if (!isOpen) return;
    setValue(makeEmptyFormValue(fields, initialValue));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, fields.map((f) => String(f.fieldKey ?? "")).join("|")]);

  function setField(key: string, v: any) {
    setValue((prev) => ({ ...prev, [key]: v }));
  }

  function isRequired(f: EventFormFieldUI) {
    return Boolean(f.isRequired ?? false);
  }

  function isValid(v: AttendeeEditorValue) {
    for (const f of fields) {
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


  async function handleSubmit() {
    await onSubmit(value);
  }

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
          <AttendeeFieldsForm
            fields={fields}
            values={value}
            errors={{}} // ou plus tard si tu fais une validation live
            onChange={(fieldKey, val) => setField(fieldKey, val)}
          />
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

  if (layout === "inline") {
    if (anim === "closed") return null;
    return card;
  }

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
