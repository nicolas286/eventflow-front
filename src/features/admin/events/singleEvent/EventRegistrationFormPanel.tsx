import { useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { EventFormField } from "../../../../domain/models/db/db.eventFormFields.schema";
import type { CreateEventFormFieldInput } from "../../../../domain/models/admin/admin.createFormField.schema";
import type { UpdateEventFormFieldPatch } from "../../../../domain/models/admin/admin.updateEventFormFieldPatch.schema";

import { useCreateEventFormField } from "../../hooks/useCreateEventFormField";
import { useUpdateEventFormField } from "../../hooks/useUpdateEventFormField";
import { useDeleteEventFormField } from "../../hooks/useDeleteEventFormField"; // ✅ NEW

type Props = {
  supabase: SupabaseClient;
  event: { id: string } | null;
  fields: EventFormField[];
  onChanged?: () => void;
};

const FIELDS_TABLE = "event_form_fields";

const FIELD_TYPES = [
  { value: "text", label: "Texte" },
  { value: "email", label: "Email" },
  { value: "date", label: "Date" },
  { value: "phone", label: "Téléphone" },
  { value: "country", label: "Pays" },
  { value: "textarea", label: "Texte long" },
  { value: "number", label: "Nombre" },
  { value: "checkbox", label: "Case à cocher" },
  { value: "select", label: "Liste (select)" },
  { value: "radio", label: "Radio" },
] as const;

type FieldType = (typeof FIELD_TYPES)[number]["value"];

type EditState = {
  id: string | null;
  label: string;
  fieldKey: string;
  fieldType: FieldType;
  isRequired: boolean;
  isActive: boolean;
  sortOrder: number;
  optionsText: string;
};

/* ------------------------------------------------------------------ */
/* Utils                                                               */
/* ------------------------------------------------------------------ */

function slugKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/__+/g, "_");
}

function clampInt(v: unknown, fallback = 0) {
  const n = typeof v === "number" ? v : Number(String(v ?? ""));
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

function normalizeOptionsToText(options: EventFormField["options"]): string {
  if (!options) return "";
  if (typeof options === "string") return options;
  try {
    return JSON.stringify(options, null, 2);
  } catch {
    return "";
  }
}

function parseOptions(text: string): EventFormField["options"] {
  const t = (text ?? "").trim();
  if (!t) return null;

  try {
    return JSON.parse(t);
  } catch {
    const lines = t
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);

    if (!lines.length) return null;

    return lines.map((line) => {
      const [a, ...rest] = line.split("|");
      const label = (a ?? "").trim();
      const value = (rest.join("|") ?? "").trim() || slugKey(label);
      return { label, value };
    });
  }
}

function uniqueKey(base: string, existing: Set<string>) {
  let k = base;
  let i = 2;
  while (existing.has(k) || !k) {
    k = `${base}_${i}`;
    i += 1;
  }
  return k;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function EventRegistrationFormPanel(props: Props) {
  const { supabase, event, fields, onChanged } = props;

  const create = useCreateEventFormField({ supabase });
  const update = useUpdateEventFormField({ supabase });
  const del = useDeleteEventFormField({ supabase }); // ✅ NEW

  const sorted = useMemo(() => {
    const arr = Array.isArray(fields) ? [...fields] : [];
    arr.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    return arr;
  }, [fields]);

  const existingKeys = useMemo(() => {
    const s = new Set<string>();
    for (const f of sorted) {
      const k = String(f.fieldKey ?? "").trim();
      if (k) s.add(k);
    }
    return s;
  }, [sorted]);

  const [editing, setEditing] = useState<EditState | null>(null);
  const [creating, setCreating] = useState(false);

  const isSaving = create.loading || update.loading;
  const saveError = create.error || update.error;

  const isDeleting = del.loading;
  const deleteError = del.error;

  function openCreate() {
    create.reset();
    update.reset();
    del.reset(); // ✅ clear delete errors

    const nextSort = (sorted.at(-1)?.sortOrder ?? 0) + 1;

    setCreating(true);
    setEditing({
      id: null,
      label: "",
      fieldKey: "",
      fieldType: "text",
      isRequired: false,
      isActive: true,
      sortOrder: nextSort,
      optionsText: "",
    });
  }

  function openEdit(f: EventFormField) {
    create.reset();
    update.reset();
    del.reset(); // ✅ clear delete errors

    setCreating(false);
    setEditing({
      id: f.id,
      label: f.label ?? "",
      fieldKey: f.fieldKey ?? "",
      fieldType: (f.fieldType ?? "text") as FieldType,
      isRequired: Boolean(f.isRequired),
      isActive: Boolean(f.isActive ?? true),
      sortOrder: clampInt(f.sortOrder ?? 0, 0),
      optionsText: normalizeOptionsToText(f.options ?? null),
    });
  }

  function closeEditor() {
    setEditing(null);
    setCreating(false);
    // pas obligatoire, mais ça évite de garder un vieux message rouge
    create.reset();
    update.reset();
    del.reset();
  }

  async function quickToggle(id: string, patch: Record<string, any>) {
    const { error } = await supabase.from(FIELDS_TABLE).update(patch).eq("id", id);
    if (error) return;
    onChanged?.();
  }

  async function move(id: string, dir: -1 | 1) {
    const idx = sorted.findIndex((x) => String(x.id) === String(id));
    if (idx < 0) return;

    const a = sorted[idx];
    const b = sorted[idx + dir];
    if (!b) return;

    const aOrder = clampInt(a.sortOrder ?? 0, 0);
    const bOrder = clampInt(b.sortOrder ?? 0, 0);

    const { error: e1 } = await supabase.from(FIELDS_TABLE).update({ sort_order: bOrder }).eq("id", a.id);
    if (e1) return;

    const { error: e2 } = await supabase.from(FIELDS_TABLE).update({ sort_order: aOrder }).eq("id", b.id);
    if (e2) return;

    onChanged?.();
  }

  function buildKey(edit: EditState) {
    const baseKey = slugKey(edit.fieldKey || edit.label);
    return edit.id ? baseKey : uniqueKey(baseKey, existingKeys);
  }

  function buildOptions(edit: EditState) {
    if (edit.fieldType === "select" || edit.fieldType === "radio") {
      return parseOptions(edit.optionsText);
    }
    return null;
  }

  async function save() {
    if (!editing || isSaving) return;
    if (!event?.id) return;

    const label = editing.label.trim();
    if (!label) return;

    const key = buildKey(editing);
    const options = buildOptions(editing);

    if (creating) {
      const input: CreateEventFormFieldInput = {
        eventId: event.id,
        label,
        fieldKey: key,
        fieldType: editing.fieldType as any,
        isRequired: editing.isRequired,
        isActive: editing.isActive,
        sortOrder: clampInt(editing.sortOrder, 0),
        options,
      } as CreateEventFormFieldInput;

      const created = await create.createEventFormField(input);
      if (!created) return;

      closeEditor();
      onChanged?.();
      return;
    }

    if (!editing.id) return;

    const patch: Omit<UpdateEventFormFieldPatch, "id"> = {
      label,
      fieldKey: key,
      fieldType: editing.fieldType as any,
      isRequired: editing.isRequired,
      isActive: editing.isActive,
      sortOrder: clampInt(editing.sortOrder, 0),
      options,
    };

    const updated = await update.updateEventFormField({
      fieldId: editing.id,
      patch,
    });

    if (!updated) return;

    closeEditor();
    onChanged?.();
  }

  async function remove(fieldId: string) {
    if (!fieldId || isDeleting) return;

    const ok = await del.deleteEventFormField({ id: fieldId });
    if (!ok) return;

    if (editing?.id === fieldId) closeEditor();
    onChanged?.();
  }

  return (
    <div className="adminRegForm">
      <div className="adminEventHeaderRow">
        <div>
          <h3 style={{ margin: 0 }}>Formulaire d’inscription</h3>
          <div className="adminEventHint">
            Gère les champs demandés aux participants. Tu peux activer/désactiver et rendre requis.
          </div>
        </div>

        <div className="adminEventHeaderActions">
          <button type="button" className="adminEventBtn" onClick={openCreate} disabled={!event?.id}>
            Ajouter un champ
          </button>
        </div>
      </div>

      <div className="adminRegGrid">
        <div className="adminRegList">
          {sorted.length === 0 ? (
            <div className="adminEventEmpty">Aucun champ. Clique “Ajouter un champ”.</div>
          ) : (
            sorted.map((f, idx) => {
              const id = String(f.id);
              const active = Boolean(f.isActive ?? true);
              const required = Boolean(f.isRequired ?? false);
              const type = String(f.fieldType ?? "text");
              const key = String(f.fieldKey ?? "");

              return (
                <div key={id} className={active ? "adminRegCard" : "adminRegCard isInactive"}>
                  <div className="adminRegTop">
                    <div className="adminRegTitle">{f.label}</div>

                    <div className="adminRegPills">
                      <span className={active ? "adminRegPill" : "adminRegPill isOff"}>
                        {active ? "Actif" : "Inactif"}
                      </span>
                      <span className={required ? "adminRegPill isReq" : "adminRegPill isOpt"}>
                        {required ? "Requis" : "Optionnel"}
                      </span>
                    </div>
                  </div>

                  <div className="adminRegMeta">
                    <span className="adminRegKey">
                      <code>{key}</code>
                    </span>
                    <span>•</span>
                    <span>Type : {type}</span>
                    <span>•</span>
                    <span>Ordre : {f.sortOrder ?? idx + 1}</span>
                  </div>

                  <div className="adminRegActions">
                    <button type="button" className="adminTicketBtn" onClick={() => openEdit(f)}>
                      Éditer
                    </button>

                    <button
                      type="button"
                      className="adminTicketBtn"
                      onClick={() => quickToggle(id, { is_required: !required })}
                    >
                      {required ? "Rendre optionnel" : "Rendre requis"}
                    </button>

                    <button
                      type="button"
                      className="adminTicketBtn"
                      onClick={() => quickToggle(id, { is_active: !active })}
                    >
                      {active ? "Désactiver" : "Activer"}
                    </button>

                    <button type="button" className="adminTicketBtn" onClick={() => move(id, -1)} disabled={idx === 0}>
                      ↑
                    </button>

                    <button
                      type="button"
                      className="adminTicketBtn"
                      onClick={() => move(id, 1)}
                      disabled={idx === sorted.length - 1}
                    >
                      ↓
                    </button>

                    <button
                      type="button"
                      className="adminTicketBtn danger"
                      onClick={() => remove(id)}
                      disabled={isDeleting}
                    >
                      {isDeleting ? "Suppression…" : "Supprimer"}
                    </button>
                  </div>
                </div>
              );
            })
          )}

          {deleteError ? (
            <div className="adminEventHint" style={{ color: "crimson", marginTop: 10 }}>
              {deleteError}
            </div>
          ) : null}
        </div>

        <div className="adminRegEditor">
          {editing ? (
            <div className="adminTicketsEditorCard">
              <div className="adminTicketsEditorHeader">
                <div>
                  <div className="adminTicketsEditorTitle">{creating ? "Nouveau champ" : "Éditer champ"}</div>
                  <div className="adminEventHint">
                    Pour <code>select</code>/<code>radio</code> : options en JSON ou une ligne par option.
                  </div>
                </div>

                <button type="button" className="adminTicketBtn" onClick={closeEditor}>
                  Fermer
                </button>
              </div>

              <div className="adminEventFormGrid" style={{ marginTop: 12 }}>
                <div className="adminEventField">
                  <div className="adminEventLabel">Label</div>
                  <input
                    className="adminEventInput"
                    value={editing.label}
                    onChange={(e) => setEditing({ ...editing, label: e.target.value })}
                    placeholder="Ex: Allergies"
                  />
                </div>

                <div className="adminEventField">
                  <div className="adminEventLabel">fieldKey</div>
                  <input
                    className="adminEventInput"
                    value={editing.fieldKey}
                    onChange={(e) => setEditing({ ...editing, fieldKey: e.target.value })}
                    onBlur={() => setEditing((s) => (s ? { ...s, fieldKey: slugKey(s.fieldKey) } : s))}
                    placeholder="ex: allergies"
                    spellCheck={false}
                  />
                  <button
                    type="button"
                    className="adminEventInlineBtn"
                    onClick={() => setEditing((s) => (s ? { ...s, fieldKey: slugKey(s.label) } : s))}
                    disabled={!editing.label.trim()}
                  >
                    Générer depuis le label
                  </button>
                </div>

                <div className="adminEventField">
                  <div className="adminEventLabel">Type</div>
                  <select
                    className="adminEventInput"
                    value={editing.fieldType}
                    onChange={(e) => setEditing({ ...editing, fieldType: e.target.value as FieldType })}
                  >
                    {FIELD_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="adminEventField">
                  <div className="adminEventLabel">Ordre</div>
                  <input
                    className="adminEventInput"
                    type="number"
                    value={editing.sortOrder}
                    onChange={(e) => setEditing({ ...editing, sortOrder: clampInt(e.target.value, 0) })}
                  />
                </div>

                <div className="adminEventField">
                  <div className="adminEventLabel">Requis</div>
                  <label className="adminEventToggle">
                    <input
                      type="checkbox"
                      checked={editing.isRequired}
                      onChange={(e) => setEditing({ ...editing, isRequired: e.target.checked })}
                    />
                    <span>{editing.isRequired ? "Requis" : "Optionnel"}</span>
                  </label>
                </div>

                <div className="adminEventField">
                  <div className="adminEventLabel">Actif</div>
                  <label className="adminEventToggle">
                    <input
                      type="checkbox"
                      checked={editing.isActive}
                      onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })}
                    />
                    <span>{editing.isActive ? "Actif" : "Inactif"}</span>
                  </label>
                </div>

                {editing.fieldType === "select" || editing.fieldType === "radio" ? (
                  <div className="adminEventField adminEventFieldSpan2">
                    <div className="adminEventLabel">Options</div>
                    <textarea
                      className="adminEventTextarea"
                      value={editing.optionsText}
                      onChange={(e) => setEditing({ ...editing, optionsText: e.target.value })}
                      placeholder={`JSON: [{"label":"Oui","value":"yes"}]\nOU\nUne option par ligne:\nOui|yes\nNon|no`}
                    />
                  </div>
                ) : null}
              </div>

              {saveError ? (
                <div className="adminEventHint" style={{ color: "crimson", marginTop: 10 }}>
                  {saveError}
                </div>
              ) : null}

              <div className="adminTicketsEditorFooter">
                <button type="button" className="adminEventBtn" onClick={save} disabled={!editing.label.trim() || isSaving}>
                  {isSaving ? "Enregistrement…" : "Enregistrer"}
                </button>
              </div>
            </div>
          ) : (
            <div className="adminEventEmpty">Sélectionne un champ (ou “Ajouter un champ”).</div>
          )}
        </div>
      </div>
    </div>
  );
}
