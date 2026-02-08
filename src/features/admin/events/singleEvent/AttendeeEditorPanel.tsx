import { useEffect, useMemo, useState } from "react";
import { Button, EditorShell } from "../../../../ui/components";

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
    // compat: "Oui\nNon"
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
  arr.sort((a, b) => clampInt(a.sortOrder ?? 0, 0) - clampInt(b.sortOrder ?? 0, 0));
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
  // phone/country -> text (tu pourras spécialiser plus tard)
  return "text";
}

export function AttendeeEditorPanel(props: {
  isOpen: boolean;
  mode: AttendeeEditorMode;

  /** Champs venant du builder de formulaire d’inscription */
  fields: RegistrationFieldLike[];

  /** Valeurs initiales (edit) ou {} (create) */
  initialValue: AttendeeEditorValue;

  /** Hook de fermeture */
  onRequestClose: () => void;

  /** Submit final (à brancher sur ton repo/RPC ensuite) */
  onSubmit: (value: AttendeeEditorValue) => Promise<void> | void;

  /** Loading externe éventuel */
  isSaving?: boolean;

  /** Sticky top sous la navbar */
  stickyTop?: number;

  /** Largeur editor */
  editorWidth?: number;
  editorGap?: number;

  /** Erreur */
  error?: string | null;

  /** Contenu à gauche (liste / page) */
  left: React.ReactNode;
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
    error = null,
    left,
  } = props;

  const normalizedFields = useMemo(() => normalizeFields(fields), [fields]);

  const [value, setValue] = useState<AttendeeEditorValue>({ ...(initialValue ?? {}) });

  // ✅ s’adapte “en temps réel” si les champs changent :
  // - on garde les valeurs existantes
  // - on ajoute les nouvelles keys à vide
  // - on ne supprime pas les anciennes (au cas où) -> tu peux changer si tu veux.
  useEffect(() => {
    const next = { ...(initialValue ?? {}) };

    for (const f of normalizedFields) {
      const key = String(f.fieldKey ?? "").trim();
      if (!key) continue;
      if (next[key] === undefined) next[key] = "";
    }

    setValue((prev) => {
      // merge doux : prev gagne sur initial (si user a déjà tapé)
      return { ...next, ...prev };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedFields.map((f) => String(f.fieldKey ?? "")).join("|")]);

  // si on change complètement de cible (edit d’un autre attendee), on reset
  useEffect(() => {
    setValue({ ...(initialValue ?? {}) });
  }, [initialValue, isOpen]);

  function setField(key: string, v: any) {
    setValue((prev) => ({ ...prev, [key]: v }));
  }

  function isRequired(f: RegistrationFieldLike) {
    return Boolean(f.isRequired ?? false);
  }

  function isValid() {
    for (const f of normalizedFields) {
      const key = String(f.fieldKey ?? "").trim();
      if (!key) continue;
      if (!isRequired(f)) continue;

      const v = value[key];
      if (f.fieldType === "checkbox") {
        if (!Boolean(v)) return false;
        continue;
      }
      if (String(v ?? "").trim().length === 0) return false;
    }
    return true;
  }

  async function handleSubmit() {
    if (isSaving) return;
    await onSubmit(value);
  }

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

            <div className="adminEventFormGrid" style={{ marginTop: 12 }}>
              {normalizedFields.length === 0 ? (
                <div className="adminEventEmpty">
                  Aucun champ actif dans le formulaire d’inscription. Ajoute des champs pour pouvoir remplir un participant.
                </div>
              ) : (
                normalizedFields.map((f) => {
                  const key = String(f.fieldKey ?? "").trim();
                  const label = String(f.label ?? key).trim();
                  const type = (f.fieldType ?? "text") as FieldType;

                  const req = isRequired(f);
                  const options = toOptions(f.options);

                  // layout: textarea / select-radio en span2 (plus confortable)
                  const span2 =
                    type === "textarea" || type === "select" || type === "radio" ? "adminEventFieldSpan2" : "";

                  if (!key) return null;

                  if (type === "checkbox") {
                    return (
                      <div key={key} className={`adminEventField ${span2}`}>
                        <div className="adminEventLabel">
                          {label} {req ? "*" : ""}
                        </div>

                        <label className="adminEventToggle">
                          <input
                            type="checkbox"
                            checked={Boolean(value[key])}
                            onChange={(e) => setField(key, e.target.checked)}
                            disabled={isSaving}
                          />
                          <span>{Boolean(value[key]) ? "Oui" : "Non"}</span>
                        </label>
                      </div>
                    );
                  }

                  if (type === "select") {
                    return (
                      <div key={key} className={`adminEventField ${span2}`}>
                        <div className="adminEventLabel">
                          {label} {req ? "*" : ""}
                        </div>

                        <select
                          className="adminEventInput"
                          value={String(value[key] ?? "")}
                          onChange={(e) => setField(key, e.target.value)}
                          disabled={isSaving}
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

                  if (type === "radio") {
                    return (
                      <div key={key} className={`adminEventField ${span2}`}>
                        <div className="adminEventLabel">
                          {label} {req ? "*" : ""}
                        </div>

                        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                          {options.length ? (
                            options.map((o) => (
                              <label key={`${key}:${o.value}`} className="adminEventToggle" style={{ cursor: "pointer" }}>
                                <input
                                  type="radio"
                                  name={key}
                                  value={o.value}
                                  checked={String(value[key] ?? "") === o.value}
                                  onChange={() => setField(key, o.value)}
                                  disabled={isSaving}
                                />
                                <span>{o.label}</span>
                              </label>
                            ))
                          ) : (
                            <div className="adminEventHint">
                              Aucune option pour ce champ (radio). Ajoute des options dans le builder.
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  if (type === "textarea") {
                    return (
                      <div key={key} className={`adminEventField ${span2}`}>
                        <div className="adminEventLabel">
                          {label} {req ? "*" : ""}
                        </div>

                        <textarea
                          className="adminEventTextarea"
                          value={String(value[key] ?? "")}
                          onChange={(e) => setField(key, e.target.value)}
                          disabled={isSaving}
                        />
                      </div>
                    );
                  }

                  return (
                    <div key={key} className={`adminEventField ${span2}`}>
                      <div className="adminEventLabel">
                        {label} {req ? "*" : ""}
                      </div>

                      <input
                        className="adminEventInput"
                        type={inputTypeFor(type)}
                        value={type === "number" ? String(value[key] ?? "") : String(value[key] ?? "")}
                        onChange={(e) => {
                          if (type === "number") {
                            const raw = e.target.value;
                            setField(key, raw === "" ? "" : clampInt(raw, 0));
                            return;
                          }
                          setField(key, e.target.value);
                        }}
                        disabled={isSaving}
                      />
                    </div>
                  );
                })
              )}
            </div>

            <div className="adminTicketsEditorFooter">
              <Button variant="primary" onClick={handleSubmit} disabled={!isValid() || isSaving}>
                {isSaving ? "Enregistrement…" : mode === "create" ? "Ajouter" : "Mettre à jour"}
              </Button>
            </div>
          </div>
        ) : null
      }
    />
  );
}
