import { useEffect, useMemo, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Button } from "../../../../ui/components";

import type { EventFormFieldUI } from "../../../../domain/models/db/db.eventFormFields.schema";
import type { EventProduct } from "../../../../domain/models/db/db.eventProducts.schema";
import { AttendeeFieldsForm } from "./AttendeeFieldForm";
import { validateFieldValue } from "../../../../domain/helpers/validateFieldValue";

export type AttendeeEditorMode = "create" | "edit";
export type AttendeeEditorValue = Record<string, unknown>;
type AnimState = "closed" | "open" | "closing";

function makeEmptyFormValue(fields: EventFormFieldUI[], initialValue?: AttendeeEditorValue) {
  const next = { ...(initialValue ?? {}) };
  for (const f of fields) {
    const key = String(f.fieldKey ?? "").trim();
    if (key && next[key] === undefined) next[key] = "";
  }
  return next;
}

function computeErrors(fields: EventFormFieldUI[], values: AttendeeEditorValue) {
  const errs: Record<string, string> = {};
  for (const f of fields) {
    const key = String(f.fieldKey ?? "").trim();
    if (!key) continue;
    const msg = validateFieldValue(f as EventFormFieldUI, values[key]);
    if (msg) errs[key] = msg;
  }
  return errs;
}

export function AttendeeEditorPanel(props: {
  supabase: SupabaseClient;
  isOpen: boolean;
  mode: AttendeeEditorMode;

  orderId?: string | null;
  products: EventProduct[];

  fields: EventFormFieldUI[];
  initialValue: AttendeeEditorValue;

  onRequestClose: () => void;
  onSubmit: (value: AttendeeEditorValue) => Promise<void> | void;

  isSaving?: boolean;
  error?: string | null;

  layout?: "shell" | "inline";
}) {
  const {
    isOpen,
    mode,
    fields,
    initialValue,
    onRequestClose,
    onSubmit,
    isSaving = false,
    error: externalError = null,
    layout = "shell",
  } = props;

  const [value, setValue] = useState<AttendeeEditorValue>({ ...(initialValue ?? {}) });
  const [touched, setTouched] = useState<Record<string, true>>({});
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

useEffect(() => {
  if (!isOpen) return;

  const next = makeEmptyFormValue(fields, initialValue);
  setValue(next);
  setTouched({});
  setAttemptedSubmit(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [
  isOpen,
  JSON.stringify(initialValue), // 🔥 déclenche si on change de participant
  fields.map((f) => String(f.fieldKey ?? "")).join("|"),
]);


  const errors = useMemo(() => computeErrors(fields, value), [fields, value]);
  const isAllValid = useMemo(() => Object.keys(errors).length === 0, [errors]);

  function shouldShowErr(fieldKey: string) {
    return Boolean(attemptedSubmit || touched[fieldKey]);
  }

  function setField(key: string, v: unknown) {
    setValue((prev) => ({ ...prev, [key]: v }));
    setTouched((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
  }

  async function handleSubmit() {
    setAttemptedSubmit(true);
    if (!isAllValid) return;
    await onSubmit(value);
  }

  const saving = Boolean(isSaving);
  const error = externalError;

  /* inline anim */
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
        <div style={{ marginTop: 12 }}>
          <AttendeeFieldsForm
            fields={fields}
            values={value}
            errors={Object.fromEntries(Object.entries(errors).filter(([k]) => shouldShowErr(k)))}
            onChange={(fieldKey, val) => setField(fieldKey, val)}
          />
        </div>

        <div className="adminTicketsEditorFooter" style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Button variant="secondary" onClick={onRequestClose} disabled={saving}>
            Fermer
          </Button>

          <Button variant="primary" onClick={handleSubmit} disabled={!isAllValid || saving}>
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

  // layout shell: on laisse le parent (EditorShell) gérer sticky / anim
  return isOpen ? card : null;
}
