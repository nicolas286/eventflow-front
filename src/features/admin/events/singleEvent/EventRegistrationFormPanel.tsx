import { useMemo, useState } from "react";

type SupabaseLike = {
  from: (table: string) => {
    insert: (values: any) => any;
    update: (values: any) => any;
    delete: () => any;
    eq: (col: string, val: any) => any;
    select: (cols?: string) => any;
    single: () => any;
  };
};

type Props = {
  supabase: SupabaseLike;
  event: any;
  fields: any[];
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
] as const;

type EditState = {
  id: string | null;
  label: string;
  fieldKey: string;
  fieldType: string;
  isRequired: boolean;
  isActive: boolean;
  sortOrder: number;
  optionsText: string;
};

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

function normalizeOptionsToText(options: any): string {
  if (!options) return "";
  if (typeof options === "string") return options;

  try {
    if (Array.isArray(options)) return JSON.stringify(options, null, 2);
    if (typeof options === "object") return JSON.stringify(options, null, 2);
  } catch {
    return "";
  }

  return "";
}

function parseOptions(text: string): any {
  const t = (text ?? "").trim();
  if (!t) return null;

  try {
    const json = JSON.parse(t);
    return json;
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

export function EventRegistrationFormPanel(props: Props) {
  const { supabase, event, fields, onChanged } = props;

  const sorted = useMemo(() => {
    const arr = Array.isArray(fields) ? [...fields] : [];
    arr.sort((a, b) => (a?.sortOrder ?? a?.sort_order ?? 0) - (b?.sortOrder ?? b?.sort_order ?? 0));
    return arr;
  }, [fields]);

  const existingKeys = useMemo(() => {
    const s = new Set<string>();
    for (const f of sorted) {
      const k = String(f?.fieldKey ?? f?.field_key ?? "").trim();
      if (k) s.add(k);
    }
    return s;
  }, [sorted]);

  const [editing, setEditing] = useState<EditState | null>(null);
  const [creating, setCreating] = useState(false);

  function openCreate() {
    const nextSort = (sorted.at(-1)?.sortOrder ?? sorted.at(-1)?.sort_order ?? 0) + 1;

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

  function openEdit(f: any) {
    setCreating(false);
    setEditing({
      id: String(f.id),
      label: f.label ?? "",
      fieldKey: f.fieldKey ?? f.field_key ?? "",
      fieldType: f.fieldType ?? f.field_type ?? "text",
      isRequired: Boolean(f.isRequired ?? f.is_required),
      isActive: Boolean(f.isActive ?? f.is_active ?? true),
      sortOrder: clampInt(f.sortOrder ?? f.sort_order ?? 0, 0),
      optionsText: normalizeOptionsToText(f.options ?? null),
    });
  }

  function closeEditor() {
    setEditing(null);
    setCreating(false);
  }

  async function quickToggle(id: string, patch: any) {
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

    const aOrder = clampInt(a.sortOrder ?? a.sort_order ?? 0, 0);
    const bOrder = clampInt(b.sortOrder ?? b.sort_order ?? 0, 0);

    const { error: e1 } = await supabase.from(FIELDS_TABLE).update({ sort_order: bOrder }).eq("id", a.id);
    if (e1) return;

    const { error: e2 } = await supabase.from(FIELDS_TABLE).update({ sort_order: aOrder }).eq("id", b.id);
    if (e2) return;

    onChanged?.();
  }

  async function save() {
    if (!editing) return;
    if (!event?.id) return;

    const label = (editing.label ?? "").trim();
    if (!label) return;

    const baseKey = slugKey(editing.fieldKey || editing.label);
    const key = editing.id
      ? baseKey
      : uniqueKey(baseKey, existingKeys);

    const payload = {
      event_id: event.id,
      label,
      field_key: key,
      field_type: String(editing.fieldType ?? "text"),
      is_required: Boolean(editing.isRequired),
      is_active: Boolean(editing.isActive),
      sort_order: clampInt(editing.sortOrder ?? 0, 0),
      options: editing.fieldType === "select" ? parseOptions(editing.optionsText) : null,
    };

    if (creating) {
      const { error } = await supabase.from(FIELDS_TABLE).insert(payload);
      if (error) return;
      closeEditor();
      onChanged?.();
      return;
    }

    const { error } = await supabase.from(FIELDS_TABLE).update(payload).eq("id", editing.id);
    if (error) return;

    closeEditor();
    onChanged?.();
  }

  async function remove(f: any) {
    const id = String(f?.id ?? "");
    if (!id) return;

    const soft = await supabase.from(FIELDS_TABLE).update({ is_active: false }).eq("id", id);
    if (soft?.error) {
      const hard = await supabase.from(FIELDS_TABLE).delete().eq("id", id);
      if (hard?.error) return;
    }

    if (editing?.id === id) closeEditor();
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
          <button type="button" className="adminEventBtn" onClick={openCreate}>
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
              const active = Boolean(f.isActive ?? f.is_active ?? true);
              const required = Boolean(f.isRequired ?? f.is_required ?? false);
              const type = String(f.fieldType ?? f.field_type ?? "text");
              const key = String(f.fieldKey ?? f.field_key ?? "");

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
                    <span>Ordre : {f.sortOrder ?? f.sort_order ?? idx + 1}</span>
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

                    <button
                      type="button"
                      className="adminTicketBtn"
                      onClick={() => move(id, -1)}
                      disabled={idx === 0}
                    >
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

                    <button type="button" className="adminTicketBtn danger" onClick={() => remove(f)}>
                      Supprimer
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="adminRegEditor">
          {editing ? (
            <div className="adminTicketsEditorCard">
              <div className="adminTicketsEditorHeader">
                <div>
                  <div className="adminTicketsEditorTitle">
                    {creating ? "Nouveau champ" : "Éditer champ"}
                  </div>
                  <div className="adminEventHint">
                    Pour <code>select</code> : options en JSON ou une ligne par option.
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
                    onChange={(e) => setEditing({ ...editing, fieldType: e.target.value })}
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

                {editing.fieldType === "select" ? (
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

              <div className="adminTicketsEditorFooter">
                <button
                  type="button"
                  className="adminEventBtn"
                  onClick={save}
                  disabled={!editing.label.trim()}
                >
                  Enregistrer
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
