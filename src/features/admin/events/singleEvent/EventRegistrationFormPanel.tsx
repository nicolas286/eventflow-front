import { useEffect, useMemo, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { EventFormField, EventFormFieldOptions } from "../../../../domain/models/db/db.eventFormFields.schema";
import type { CreateEventFormFieldInput } from "../../../../domain/models/admin/admin.createFormField.schema";
import type { UpdateEventFormFieldPatch } from "../../../../domain/models/admin/admin.updateEventFormFieldPatch.schema";

import { useCreateEventFormField } from "../../hooks/useCreateEventFormField";
import { useUpdateEventFormField } from "../../hooks/useUpdateEventFormField";
import { useDeleteEventFormField } from "../../hooks/useDeleteEventFormField";
import { Button, EditorShell } from "../../../../ui/components";
import { FIELD_TYPES, type FieldType } from "../../../../domain/constants/fieldTypes";
import { useMediaQuery } from "../../../../domain/helpers/ui";
import { slugKey, normalizeContiguousSortOrder } from "../../../../domain/helpers/normalize";
import { clampInt, uniqueKey, makeClientId } from "../../../../domain/helpers/logic";
import { optionsToText } from "../../../../domain/helpers/fields";
import { sortFromDB, parseOptionsLines } from "../../../../domain/helpers/fields";

type Props = {
  supabase: SupabaseClient;
  event: { id: string } | null;
  fields: EventFormField[];
  onChanged?: () => void;
};

type EditState = {
  id: string | null;
  label: string;
  fieldType: FieldType;
  isRequired: boolean;
  isActive: boolean;
  optionsText: string;
};

export type DraftField = {
  id: string | null; 
  clientId: string; 

  label: string;
  fieldKey: string;
  fieldType: FieldType;
  isRequired: boolean;
  isActive: boolean;
  sortOrder: number;
  options: EventFormFieldOptions;

  isNew?: boolean;
};

type MoveDir = "up" | "down";

export function EventRegistrationFormPanel(props: Props) {
  const { supabase, event, fields, onChanged } = props;

  const isMobile = useMediaQuery("(max-width: 1050px)");

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

  const [moveAnim, setMoveAnim] = useState<Record<string, MoveDir>>({});
  const moveTimerRef = useRef<number | null>(null);

  const closeTimerRef = useRef<number | null>(null);
  const [closingKey, setClosingKey] = useState<string | null>(null); // "create" ou clientId
  const [isClosing, setIsClosing] = useState(false);

  const isSaving = isSavingAll || create.loading || update.loading || del.loading;

  const incomingSig = useMemo(() => {
  return sortFromDB(fields)
    .map((f) => {
      const id = String(f.id);
      const updatedAt = f.updatedAt ?? "";
      const order = clampInt(f.sortOrder, { fallback: 0 });

      return `${id}:${updatedAt}:${order}`;
    })
    .join("|");
}, [fields]);


  useEffect(() => {
    if (isDirty) return;
    if (lastLoadedSigRef.current === incomingSig) return;

    const sorted = sortFromDB(fields);
    const next: DraftField[] = normalizeContiguousSortOrder(
      sorted.map((f) => ({
        id: f.id,
        clientId: f.id,
        label: f.label ?? "",
        fieldKey: String(f.fieldKey ?? ""),
        fieldType: (f.fieldType ?? "text") as FieldType,
        isRequired: f.isRequired,
        isActive: f.isActive ?? true,
        sortOrder: clampInt(f.sortOrder ?? 0),
        options: f.options ?? null as any,
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
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
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

  function buildKeyFromLabel(label: string) {
    const base = slugKey(label);
    return uniqueKey(base, existingKeys);
  }

  function buildOptions(fieldType: FieldType, optionsText: string) {
    if (fieldType === "select" || fieldType === "radio") return parseOptionsLines(optionsText);
    return null;
  }

  function cancelClosingIfAny() {
    setIsClosing(false);
    setClosingKey(null);
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
  }

  function openCreate() {
    cancelClosingIfAny();
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
    cancelClosingIfAny();
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
      optionsText: optionsToText(f.options ?? null),
    });
  }

  function closeEditor() {
    if (!editing) {
      setCreating(false);
      return;
    }

    const key = creating ? "create" : (editing.id ?? null);
    if (!key) {
      setEditing(null);
      setCreating(false);
      return;
    }

    setIsClosing(true);
    setClosingKey(key);

    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => {
      setEditing(null);
      setCreating(false);
      setIsClosing(false);
      setClosingKey(null);
      create.reset();
      update.reset();
      del.reset();
    }, 180);
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

    if (isCreate) {
      const clientId = makeClientId();
      const key = buildKeyFromLabel(label);

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

    // ⚠️ Sur update, on ne change pas le fieldKey si tu ne veux pas casser l’existant.
    // Si tu veux le recalculer, dis-moi (là on le conserve).
    setDraft((prev) =>
      prev.map((f) =>
        f.clientId === clientId
          ? {
              ...f,
              label,
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
            fieldType: f.fieldType,
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
          fieldType: f.fieldType,
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
  const editingId = editing?.id ?? null;

  const editorNode = editing ? (
    <div className="adminRegEditorCard">
      {/* Header avec croix */}
      <div className="adminRegEditorHeader">
        <div>
          <div className="adminRegEditorTitle">
            {creating ? "Nouveau champ" : "Modifier champ"}
          </div>
          <div className="adminEventHint">
            Pour <code>select</code>/<code>radio</code> : une option par ligne.
          </div>
        </div>

        <Button
          variant="ghost"
          className="adminRegEditorClose"
          onClick={closeEditor}
          aria-label="Fermer"
        >
          ✕
        </Button>
      </div>

      {/* Form */}
      <div className="adminEventFormGrid adminRegEditorFormGrid">
        <div className="adminEventField">
          <div className="adminEventLabel">Label</div>
          <input
            className="adminEventInput"
            value={editing.label}
            onChange={(e) => setEditing({ ...editing, label: e.target.value })}
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
          <label className="adminRegCheckRow">
            <input
              type="checkbox"
              checked={editing.isRequired}
              onChange={(e) => setEditing({ ...editing, isRequired: e.target.checked })}
              disabled={isSaving}
            />
            <span>Requis</span>
          </label>

          <label className="adminRegCheckRow adminRegCheckRowSpacer">
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
              disabled={isSaving}
            />
          </div>
        )}
      </div>

      {/* Footer clean */}
      <div className="adminRegEditorFooter">
        <Button
          variant="secondary"
          onClick={closeEditor}
          disabled={isSaving}
        >
          Annuler
        </Button>

        <Button
          variant="primary"
          onClick={upsertLocalFromEditor}
          disabled={!editing.label.trim() || isSaving}
        >
          {creating ? "Ajouter" : "Enregistrer"}
        </Button>
      </div>
    </div>
  ) : null;


  const showCreateInline = (isOpen && creating) || (isClosing && closingKey === "create");

  return (
    <div className="adminRegForm">
      <div className="adminEventHeaderRow">
        <div>
          <h3 className="adminRegTitle">Formulaire d’inscription</h3>
          <div className="adminEventHint">
            Gère les champs demandés aux participants.
            {isDirty ? <span className="adminRegDirtyDot">• Modifications non sauvegardées</span> : null}
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

      {saveAllError ? <div className="adminRegSaveError">{saveAllError}</div> : null}

      {/* ---------------- Mobile : editor inline ---------------- */}
      {isMobile ? (
        <div className={isOpen || isClosing ? "adminRegInlineShell isEditorOpen" : "adminRegInlineShell"}>
          {/* Create: editor au-dessus de tout */}
          {showCreateInline ? (
            <div
              className={[
                "adminRegInlineEditor",
                "isCreate",
                isClosing && closingKey === "create" ? "isClosing" : "isOpen",
              ].join(" ")}
            >
              {editorNode}
            </div>
          ) : null}

          <div className="adminRegList">
            {draft.length === 0 ? (
              <div className="adminEventEmpty">Aucun champ. Clique “Ajouter un champ”.</div>
            ) : (
              draft.map((f, idx) => {
                const active = Boolean(f.isActive ?? true);
                const required = Boolean(f.isRequired ?? false);

                const animDir = moveAnim[f.clientId];
                const cardAnimClass = animDir === "up" ? "isMoveUp" : animDir === "down" ? "isMoveDown" : "";

                const showEditInline =
                  ((isOpen && !creating && editingId === f.clientId) || (isClosing && closingKey === f.clientId));

                return (
                  <div key={f.clientId} className="adminRegBlock">
                    <div className={[active ? "adminRegCard" : "adminRegCard isInactive", cardAnimClass].join(" ")}>
                      <div className="adminRegTop">
                        <div className="adminRegTitleLine">{f.label}</div>

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
                        <span>Type : {String(f.fieldType ?? "text")}</span>
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
                          className="adminMoveBtn"
                          aria-label="Monter"
                          variant="primary"
                        >
                          ↑
                        </Button>

                        <Button
                          onClick={() => moveLocal(f.clientId, 1)}
                          disabled={isSaving || idx === draft.length - 1}
                          className="adminMoveBtn"
                          aria-label="Descendre"
                          variant="primary"
                        >
                          ↓
                        </Button>

                        <Button variant="danger" className="deleteFormFieldButton" onClick={() => removeLocal(f.clientId)} disabled={isSaving}>
                          Supprimer
                        </Button>
                      </div>
                    </div>

                    {/* Edit: editor sous le champ cliqué */}
                    {showEditInline ? (
                      <div
                        className={[
                          "adminRegInlineEditor",
                          "isEdit",
                          isClosing && closingKey === f.clientId ? "isClosing" : "isOpen",
                        ].join(" ")}
                      >
                        {editorNode}
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* ---------------- Desktop : EditorShell à droite ---------------- */
        <EditorShell
          isOpen={isOpen}
          onRequestClose={closeEditor}
          editorWidth={420}
          editorGap={14}
          stickyTop={120}
          left={
            <div className="adminRegList">
              {draft.length === 0 ? (
                <div className="adminEventEmpty">Aucun champ. Clique “Ajouter un champ”.</div>
              ) : (
                draft.map((f, idx) => {
                  const active = Boolean(f.isActive ?? true);
                  const required = Boolean(f.isRequired ?? false);
                  const type = String(f.fieldType ?? "text");

                  const animDir = moveAnim[f.clientId];
                  const cardAnimClass = animDir === "up" ? "isMoveUp" : animDir === "down" ? "isMoveDown" : "";

                  return (
                    <div
                      key={f.clientId}
                      className={[
                        active ? "adminRegCard" : "adminRegCard isInactive",
                        cardAnimClass,
                      ].join(" ")}
                    >
                      <div className="adminRegTop">
                        <div className="adminRegTitleLine">{f.label}</div>

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
                          className="adminMoveBtn"
                          aria-label="Monter"
                          variant="primary"
                        >
                          ↑
                        </Button>

                        <Button
                          onClick={() => moveLocal(f.clientId, 1)}
                          disabled={isSaving || idx === draft.length - 1}
                          className="adminMoveBtn"
                          aria-label="Descendre"
                          variant="primary"
                        >
                          ↓
                        </Button>

                        <Button variant="danger" className="deleteFormFieldButton" onClick={() => removeLocal(f.clientId)} disabled={isSaving}>
                          Supprimer
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          }
          right={isOpen ? <div className="regEditorPanel isOpen">{editorNode}</div> : null}
        />
      )}
    </div>
  );
}
