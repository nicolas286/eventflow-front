import { useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { EventFormField } from "../../../../domain/models/db/db.eventFormFields.schema";
import type { CreateEventFormFieldInput } from "../../../../domain/models/admin/admin.createFormField.schema";
import type { UpdateEventFormFieldPatch } from "../../../../domain/models/admin/admin.updateEventFormFieldPatch.schema";

import { useCreateEventFormField } from "../../hooks/useCreateEventFormField";
import { useUpdateEventFormField } from "../../hooks/useUpdateEventFormField";
import { useDeleteEventFormField } from "../../hooks/useDeleteEventFormField";

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
  fieldType: FieldType;
  isRequired: boolean;
  isActive: boolean;
  // ✅ plus affiché / éditable par l’utilisateur, mais on le calcule pour l’insert
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

  // ✅ on accepte encore l’ancien stockage json côté DB,
  // mais côté UI on veut "une option par ligne"
  if (Array.isArray(options)) {
    return options
      .map((o: any) => String(o?.label ?? o?.value ?? "").trim())
      .filter(Boolean)
      .join("\n");
  }

  return "";
}

/**
 * UI: une option par ligne
 * - "Oui"
 * - "Non"
 *
 * DB: [{label, value}]
 */
function parseOptionsLines(text: string): EventFormField["options"] {
  const t = (text ?? "").trim();
  if (!t) return null;

  const lines = t
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);

  if (!lines.length) return null;

  return lines.map((label) => ({ label, value: slugKey(label) }));
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
  const del = useDeleteEventFormField({ supabase });

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

  function nextSortOrder() {
    const last = sorted.at(-1)?.sortOrder ?? 0;
    return clampInt(last, 0) + 1;
  }

  function openCreate() {
    create.reset();
    update.reset();
    del.reset();

    setCreating(true);
    setEditing({
      id: null,
      label: "",
      fieldType: "text",
      isRequired: false,
      isActive: true,
      sortOrder: nextSortOrder(), // ✅ auto last+1
      optionsText: "",
    });
  }

  function openEdit(f: EventFormField) {
    create.reset();
    update.reset();
    del.reset();

    setCreating(false);
    setEditing({
      id: f.id,
      label: f.label ?? "",
      fieldType: (f.fieldType ?? "text") as FieldType,
      isRequired: Boolean(f.isRequired),
      isActive: Boolean(f.isActive ?? true),
      // ✅ on garde en state pour patch (mais plus de champ UI)
      sortOrder: clampInt(f.sortOrder ?? 0, 0),
      optionsText: normalizeOptionsToText(f.options ?? null),
    });
  }

  function closeEditor() {
    setEditing(null);
    setCreating(false);
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

  function buildKeyFromLabel(label: string, forCreate: boolean) {
    const base = slugKey(label);
    return forCreate ? uniqueKey(base, existingKeys) : base;
  }

  function buildOptions(edit: EditState) {
    if (edit.fieldType === "select" || edit.fieldType === "radio") {
      return parseOptionsLines(edit.optionsText);
    }
    return null;
  }

  async function save() {
    if (!editing || isSaving) return;
    if (!event?.id) return;

    const label = editing.label.trim();
    if (!label) return;

    const key = buildKeyFromLabel(label, creating);
    const options = buildOptions(editing);

    if (creating) {
      const input: CreateEventFormFieldInput = {
        eventId: event.id,
        label,
        fieldKey: key, // ✅ toujours généré
        fieldType: editing.fieldType as any,
        isRequired: editing.isRequired,
        isActive: editing.isActive,
        sortOrder: nextSortOrder(), // ✅ toujours last+1 (pas editable)
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
      fieldKey: key, // ✅ régénéré depuis label à chaque save (comme demandé)
      fieldType: editing.fieldType as any,
      isRequired: editing.isRequired,
      isActive: editing.isActive,
      // ✅ on conserve l’ordre actuel (pas de champ UI)
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
                    <span>Type : {type}</span>
                    {/* ✅ ordre + fieldKey virés de la visualisation */}
                  </div>

                  <div className="adminRegActions">
                    <button type="button" className="adminTicketBtn" onClick={() => openEdit(f)}>
                      Modifier
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
                  <div className="adminTicketsEditorTitle">{creating ? "Nouveau champ" : "Modifier champ"}</div>
                  <div className="adminEventHint">
                    Pour <code>select</code>/<code>radio</code> : une option par ligne (ex: Oui, Non).
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

                {/* ✅ Actif / Requis simplifiés : juste les cases (pas de cadre/titre) */}
                <div className="adminEventField">
                  <label style={{ display: "flex", gap: 10, alignItems: "center", paddingTop: 6 }}>
                    <input
                      type="checkbox"
                      checked={editing.isRequired}
                      onChange={(e) => setEditing({ ...editing, isRequired: e.target.checked })}
                    />
                    <span>Requis</span>
                  </label>

                  <label style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10 }}>
                    <input
                      type="checkbox"
                      checked={editing.isActive}
                      onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })}
                    />
                    <span>Actif</span>
                  </label>
                </div>

                {(editing.fieldType === "select" || editing.fieldType === "radio") && (
                  <div className="adminEventField adminEventFieldSpan2">
                    <div className="adminEventLabel">Options</div>
                    <textarea
                      className="adminEventTextarea"
                      value={editing.optionsText}
                      onChange={(e) => setEditing({ ...editing, optionsText: e.target.value })}
                      placeholder={`Une option par ligne :\nOui\nNon\nPeut-être`}
                    />
                  </div>
                )}
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
