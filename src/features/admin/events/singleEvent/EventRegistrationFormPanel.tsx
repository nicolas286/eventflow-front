import { useEffect, useMemo, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { EventFormField } from "../../../../domain/models/db/db.eventFormFields.schema";
import type { CreateEventFormFieldInput } from "../../../../domain/models/admin/admin.createFormField.schema";
import type { UpdateEventFormFieldPatch } from "../../../../domain/models/admin/admin.updateEventFormFieldPatch.schema";

import { useCreateEventFormField } from "../../hooks/useCreateEventFormField";
import { useUpdateEventFormField } from "../../hooks/useUpdateEventFormField";
import { useDeleteEventFormField } from "../../hooks/useDeleteEventFormField";
import { Button, EditorShell } from "../../../../ui/components";

type Props = {
  supabase: SupabaseClient;
  event: { id: string } | null;
  fields: EventFormField[];
  onChanged?: () => void;
};

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
  id: string | null; // clientId (pas l'id DB)
  label: string;
  fieldType: FieldType;
  isRequired: boolean;
  isActive: boolean;
  optionsText: string;
};

type DraftField = {
  id: string | null; // id DB
  clientId: string; // id UI stable

  label: string;
  fieldKey: string;
  fieldType: FieldType;
  isRequired: boolean;
  isActive: boolean;
  sortOrder: number; // contigu (1..n)
  options: EventFormField["options"];

  isNew?: boolean;
};

type MoveDir = "up" | "down";

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

  if (Array.isArray(options)) {
    return options
      .map((o: any) => String(o?.label ?? o?.value ?? "").trim())
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

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

function makeClientId() {
  return `tmp_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function normalizeContiguousSortOrder(list: DraftField[]) {
  return list.map((f, idx) => ({ ...f, sortOrder: idx + 1 }));
}

function sortFromDB(fields: EventFormField[]) {
  const arr = Array.isArray(fields) ? [...fields] : [];
  arr.sort((a, b) => clampInt(a.sortOrder ?? 0, 0) - clampInt(b.sortOrder ?? 0, 0));
  return arr;
}

export function EventRegistrationFormPanel(props: Props) {
  const { supabase, event, fields, onChanged } = props;

  const create = useCreateEventFormField({ supabase });
  const update = useUpdateEventFormField({ supabase });
  const del = useDeleteEventFormField({ supabase });

  const [draft, setDraft] = useState<DraftField[]>([]);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  const [editing, setEditing] = useState<EditState | null>(null);
  const [creating, setCreating] = useState(false);

  const [isDirty, setIsDirty] = useState(false);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [saveAllError, setSaveAllError] = useState<string | null>(null);

  const lastLoadedSigRef = useRef<string>("");

  // ✅ Anim move (cartes + flèches) : on garde une trace courte des items concernés
  const [moveAnim, setMoveAnim] = useState<Record<string, MoveDir>>({});
  const moveTimerRef = useRef<number | null>(null);

  const isSaving = isSavingAll || create.loading || update.loading || del.loading;

  const incomingSig = useMemo(() => {
    const sorted = sortFromDB(fields);
    return sorted
      .map((f) => `${String(f.id)}:${String((f as any).updatedAt ?? "")}:${clampInt(f.sortOrder ?? 0, 0)}`)
      .join("|");
  }, [fields]);

  useEffect(() => {
    if (isDirty) return;
    if (lastLoadedSigRef.current === incomingSig) return;

    const sorted = sortFromDB(fields);
    const next: DraftField[] = normalizeContiguousSortOrder(
      sorted.map((f) => ({
        id: String(f.id),
        clientId: String(f.id),
        label: f.label ?? "",
        fieldKey: String((f as any).fieldKey ?? ""),
        fieldType: ((f as any).fieldType ?? "text") as FieldType,
        isRequired: Boolean((f as any).isRequired),
        isActive: Boolean((f as any).isActive ?? true),
        sortOrder: clampInt((f as any).sortOrder ?? 0, 0),
        options: ((f as any).options ?? null) as any,
      }))
    );

    setDraft(next);
    setDeletedIds(new Set());
    setSaveAllError(null);
    lastLoadedSigRef.current = incomingSig;
  }, [incomingSig, fields, isDirty]);

  useEffect(() => {
    return () => {
      if (moveTimerRef.current) window.clearTimeout(moveTimerRef.current);
    };
  }, []);

  const existingKeys = useMemo(() => {
    const s = new Set<string>();
    for (const f of draft) {
      const k = String(f.fieldKey ?? "").trim();
      if (k) s.add(k);
    }
    return s;
  }, [draft]);

  function markDirty() {
    setIsDirty(true);
    setSaveAllError(null);
  }

  function buildKeyFromLabel(label: string, forCreate: boolean) {
    const base = slugKey(label);
    return forCreate ? uniqueKey(base, existingKeys) : uniqueKey(base, existingKeys);
  }

  function buildOptions(fieldType: FieldType, optionsText: string) {
    if (fieldType === "select" || fieldType === "radio") {
      return parseOptionsLines(optionsText);
    }
    return null;
  }

  function openCreate() {
    setSaveAllError(null);
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
      optionsText: "",
    });
  }

  function openEdit(f: DraftField) {
    setSaveAllError(null);
    create.reset();
    update.reset();
    del.reset();

    setCreating(false);
    setEditing({
      id: f.clientId,
      label: f.label ?? "",
      fieldType: (f.fieldType ?? "text") as FieldType,
      isRequired: Boolean(f.isRequired),
      isActive: Boolean(f.isActive ?? true),
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

  function toggleLocal(clientId: string, patch: Partial<Pick<DraftField, "isRequired" | "isActive">>) {
    setDraft((prev) => prev.map((f) => (f.clientId === clientId ? { ...f, ...patch } : f)));
    markDirty();
  }

  function triggerMoveAnim(aId: string, aDir: MoveDir, bId?: string, bDir?: MoveDir) {
    if (moveTimerRef.current) window.clearTimeout(moveTimerRef.current);

    setMoveAnim((prev) => {
      const next = { ...prev, [aId]: aDir };
      if (bId && bDir) next[bId] = bDir;
      return next;
    });

    moveTimerRef.current = window.setTimeout(() => {
      setMoveAnim({});
      moveTimerRef.current = null;
    }, 220);
  }

  function moveLocal(clientId: string, dir: -1 | 1) {
    setDraft((prev) => {
      const idx = prev.findIndex((x) => x.clientId === clientId);
      if (idx < 0) return prev;

      const nextIdx = idx + dir;
      if (nextIdx < 0 || nextIdx >= prev.length) return prev;

      const copy = [...prev];
      const a = copy[idx];
      const b = copy[nextIdx];

      copy[idx] = b;
      copy[nextIdx] = a;

      // ✅ anim: a bouge dans dir, b bouge dans l'inverse
      const aDir: MoveDir = dir === -1 ? "up" : "down";
      const bDir: MoveDir = dir === -1 ? "down" : "up";
      triggerMoveAnim(a.clientId, aDir, b.clientId, bDir);

      return normalizeContiguousSortOrder(copy);
    });

    markDirty();
  }

  function removeLocal(clientId: string) {
    setDraft((prev) => {
      const f = prev.find((x) => x.clientId === clientId);
      if (!f) return prev;

      if (f.id) {
        setDeletedIds((s) => {
          const ns = new Set(s);
          ns.add(f.id!);
          return ns;
        });
      }

      const next = prev.filter((x) => x.clientId !== clientId);
      return normalizeContiguousSortOrder(next);
    });

    if (editing?.id === clientId) closeEditor();
    markDirty();
  }

  function upsertLocalFromEditor() {
    if (!editing) return;

    const label = editing.label.trim();
    if (!label) return;

    const isCreate = creating;
    const options = buildOptions(editing.fieldType, editing.optionsText);
    const key = buildKeyFromLabel(label, isCreate);

    if (isCreate) {
      const clientId = makeClientId();
      const nextField: DraftField = {
        id: null,
        clientId,
        label,
        fieldKey: key,
        fieldType: editing.fieldType,
        isRequired: editing.isRequired,
        isActive: editing.isActive,
        sortOrder: draft.length + 1,
        options,
        isNew: true,
      };

      setDraft((prev) => normalizeContiguousSortOrder([...prev, nextField]));
      markDirty();
      closeEditor();
      return;
    }

    const clientId = editing.id;
    if (!clientId) return;

    setDraft((prev) =>
      prev.map((f) =>
        f.clientId === clientId
          ? {
              ...f,
              label,
              fieldKey: key,
              fieldType: editing.fieldType,
              isRequired: editing.isRequired,
              isActive: editing.isActive,
              options,
            }
          : f
      )
    );

    markDirty();
    closeEditor();
  }

  function resetLocalChanges() {
    setIsDirty(false);
    setSaveAllError(null);
    lastLoadedSigRef.current = "";
  }

  async function saveAll() {
    if (!event?.id) return;
    if (isSaving) return;

    setIsSavingAll(true);
    setSaveAllError(null);

    try {
      const normalized = normalizeContiguousSortOrder(draft);

      const toDelete = Array.from(deletedIds);
      for (const id of toDelete) {
        const ok = await del.deleteEventFormField({ id });
        if (!ok) throw new Error(String(del.error || "Erreur suppression"));
      }

      for (const f of normalized) {
        const options = f.options ?? null;

        if (!f.id) {
          const input: CreateEventFormFieldInput = {
            eventId: event.id,
            label: f.label,
            fieldKey: f.fieldKey,
            fieldType: f.fieldType as any,
            isRequired: f.isRequired,
            isActive: f.isActive,
            sortOrder: f.sortOrder,
            options,
          } as CreateEventFormFieldInput;

          const created = await create.createEventFormField(input);
          if (!created) throw new Error(String(create.error || "Erreur création"));
          continue;
        }

        const patch: Omit<UpdateEventFormFieldPatch, "id"> = {
          label: f.label,
          fieldKey: f.fieldKey,
          fieldType: f.fieldType as any,
          isRequired: f.isRequired,
          isActive: f.isActive,
          sortOrder: f.sortOrder,
          options,
        };

        const updated = await update.updateEventFormField({ fieldId: f.id, patch });
        if (!updated) throw new Error(String(update.error || "Erreur mise à jour"));
      }

      setIsDirty(false);
      setDeletedIds(new Set());
      onChanged?.();
    } catch (e: any) {
      setSaveAllError(e?.message ? String(e.message) : "Erreur inconnue");
    } finally {
      setIsSavingAll(false);
    }
  }

  const isOpen = Boolean(editing);

  return (
    <div className="adminRegForm">
      <div className="adminEventHeaderRow">
        <div>
          <h3 style={{ margin: 0 }}>Formulaire d’inscription</h3>
          <div className="adminEventHint">
            Gère les champs demandés aux participants. Tu peux activer/désactiver et rendre requis.
            {isDirty ? (
              <span style={{ marginLeft: 10, fontWeight: 900, color: "#b45309" }}>
                • Modifications non sauvegardées
              </span>
            ) : null}
          </div>
        </div>

        <div className="adminEventHeaderActions">
          <Button onClick={openCreate} disabled={!event?.id || isSaving}>
            Ajouter un champ
          </Button>

          <Button onClick={saveAll} disabled={!event?.id || !isDirty || isSaving}>
            {isSavingAll ? "Sauvegarde…" : "Sauvegarder"}
          </Button>

          {isDirty ? (
            <Button onClick={resetLocalChanges} disabled={isSaving}>
              Annuler
            </Button>
          ) : null}
        </div>
      </div>

      {saveAllError ? (
        <div className="adminEventHint" style={{ color: "crimson", marginTop: 2 }}>
          {saveAllError}
        </div>
      ) : null}

      <EditorShell
        isOpen={isOpen}
        onRequestClose={closeEditor}
        editorWidth={420}
        editorGap={14}
        stickyTop={84}
        left={
          <div className="adminRegList">
            {draft.length === 0 ? (
              <div className="adminEventEmpty">Aucun champ. Clique “Ajouter un champ”.</div>
            ) : (
              draft.map((f, idx) => {
                const active = Boolean(f.isActive ?? true);
                const required = Boolean(f.isRequired ?? false);
                const type = String(f.fieldType ?? "text");

                const animDir = moveAnim[f.clientId]; // "up" | "down" | undefined
                const cardAnimClass =
                  animDir === "up" ? "isMoveUp" : animDir === "down" ? "isMoveDown" : "";

                return (
                  <div
                    key={f.clientId}
                    className={[
                      active ? "adminRegCard" : "adminRegCard isInactive",
                      cardAnimClass,
                    ].join(" ")}
                  >
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
                    </div>

                    <div className="adminRegActions">
                      <Button variant="secondary" onClick={() => openEdit(f)} disabled={isSaving}>
                        Modifier
                      </Button>

                      <Button
                        onClick={() => toggleLocal(f.clientId, { isRequired: !required })}
                        disabled={isSaving}
                        variant="secondary"
                      >
                        {required ? "Rendre optionnel" : "Rendre requis"}
                      </Button>

                      <Button
                        onClick={() => toggleLocal(f.clientId, { isActive: !active })}
                        disabled={isSaving}
                        variant="secondary"
                      >
                        {active ? "Désactiver" : "Activer"}
                      </Button>

                      <Button
                        onClick={() => moveLocal(f.clientId, -1)}
                        disabled={isSaving || idx === 0}
                        className={[
                          "adminMoveBtn",
                          animDir === "up" ? "isBumpUp" : "",
                        ].join(" ")}
                        aria-label="Monter"
                        variant="secondary"
                      >
                        ↑
                      </Button>

                      <Button
                        onClick={() => moveLocal(f.clientId, 1)}
                        disabled={isSaving || idx === draft.length - 1}
                        className={[
                          "adminMoveBtn",
                          animDir === "down" ? "isBumpDown" : "",
                        ].join(" ")}
                        aria-label="Descendre"
                        variant="secondary"
                      >
                        ↓
                      </Button>

                      <Button
                        variant="danger"
                        onClick={() => removeLocal(f.clientId)}
                        disabled={isSaving}
                      >
                        Supprimer
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        }
        right={
          editing ? (
            <div className="adminTicketsEditorCard">
              <div className="adminTicketsEditorHeader">
                <div>
                  <div className="adminTicketsEditorTitle">{creating ? "Nouveau champ" : "Modifier champ"}</div>
                  <div className="adminEventHint">
                    Pour <code>select</code>/<code>radio</code> : une option par ligne (ex: Oui, Non).
                  </div>
                </div>
              </div>

              <div className="adminEventFormGrid" style={{ marginTop: 12 }}>
                <div className="adminEventField">
                  <div className="adminEventLabel">Label</div>
                  <input
                    className="adminEventInput"
                    value={editing.label}
                    onChange={(e) => setEditing({ ...editing, label: e.target.value })}
                    placeholder="Ex: Allergies"
                    disabled={isSaving}
                  />
                </div>

                <div className="adminEventField">
                  <div className="adminEventLabel">Type</div>
                  <select
                    className="adminEventInput"
                    value={editing.fieldType}
                    onChange={(e) => setEditing({ ...editing, fieldType: e.target.value as FieldType })}
                    disabled={isSaving}
                  >
                    {FIELD_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="adminEventField">
                  <label style={{ display: "flex", gap: 10, alignItems: "center", paddingTop: 6 }}>
                    <input
                      type="checkbox"
                      checked={editing.isRequired}
                      onChange={(e) => setEditing({ ...editing, isRequired: e.target.checked })}
                      disabled={isSaving}
                    />
                    <span>Requis</span>
                  </label>

                  <label style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10 }}>
                    <input
                      type="checkbox"
                      checked={editing.isActive}
                      onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })}
                      disabled={isSaving}
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
                      disabled={isSaving}
                    />
                  </div>
                )}
              </div>

              <div className="adminTicketsEditorFooter">
                <Button
                  onClick={upsertLocalFromEditor}
                  disabled={!editing.label.trim() || isSaving}
                  variant="primary"
                >
                  {creating ? "Ajouter (local)" : "Appliquer (local)"}
                </Button>
              </div>
            </div>
          ) : null
        }
      />
    </div>
  );
}
