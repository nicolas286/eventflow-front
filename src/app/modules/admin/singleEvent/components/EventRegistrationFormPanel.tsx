import { useEffect, useMemo, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { EventFormField, EventFormFieldGroup, EventFormFieldOptions } from "@shared/models/db/db.eventFormFields.schema";
import type { CreateEventFormFieldInput } from "../../forms/schemas/admin.createFormField.schema";
import type { UpdateEventFormFieldPatch } from "../../forms/schemas/admin.updateEventFormFieldPatch.schema";
import { useCreateEventFormField } from "../../forms/hooks/useCreateEventFormField";
import { useUpdateEventFormField } from "../../forms/hooks/useUpdateEventFormField";
import { useDeleteEventFormField } from "../../forms/hooks/useDeleteEventFormField";
import { useCreateEventFormFieldGroup } from "../../forms/hooks/useCreateEventFormFieldGroup";
import { Button, EditorShell, StickySaveBar, FilterBar } from "@ui/components";
import { FIELD_TYPES, type FieldType } from "@shared/constants/fieldTypes";
import { useMediaQuery } from "@helpers/ui";
import { slugKey, normalizeContiguousSortOrder } from "@helpers/normalize";
import { clampInt, uniqueKey, makeClientId } from "@helpers/logic";
import { optionsToText, sortFromDB, parseOptionsLines, optionsToInlineText } from "@helpers/fields";
import { TrashIcon } from "@ui/components/icon/Icons";
import { FlexPanel } from "@ui/components/panels/FlexPanel";

import "./adminSingleEvent.form.desktop.css";
import "./adminSingleEvent.form.mobile.css"; 


type Props = {
  supabase: SupabaseClient;
  event: { id: string } | null;
  fields: EventFormField[];
  fieldsGroups: EventFormFieldGroup[];
  onChanged?: () => void;
};

type EditState = {
  id: string | null;
  label: string;
  fieldType: FieldType;
  groupId: string | null;
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
  groupId: string | null;
  isRequired: boolean;
  isActive: boolean;
  sortOrder: number;
  options: EventFormFieldOptions;

  isNew?: boolean;
};

type MoveDir = "up" | "down";

export function EventRegistrationFormPanel(props: Props) {
  const { supabase, event, fields, fieldsGroups, onChanged } = props;

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

  // ✅ Search / filter
  const [query, setQuery] = useState("");
  const isFiltering = query.trim().length > 0;

  const createGroup = useCreateEventFormFieldGroup({ supabase });
  const [newGroupLabel, setNewGroupLabel] = useState("");

  const isSaving = isSavingAll || create.loading || update.loading || del.loading || createGroup.loading;

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
      groupId: f.groupId ?? null,
      isRequired: f.isRequired,
      isActive: f.isActive ?? true,
      sortOrder: clampInt(f.sortOrder ?? 0),
      options: f.options ?? null,
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
    if (fieldType === "select" /*|| fieldType === "radio"*/) return parseOptionsLines(optionsText);
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
      groupId: null,
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
      groupId: f.groupId ?? null,
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
        groupId: editing.groupId ?? null,
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
              fieldType: editing.fieldType,
              groupId: editing.groupId ?? null,
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
            groupId: f.groupId ?? null,
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
          groupId: f.groupId ?? null,
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

  async function handleCreateGroup() {
  if (!event?.id || isSaving) return;

  const label = newGroupLabel.trim();
  if (!label) return;

  const nextSortOrder =
    (fieldsGroups.length > 0
      ? Math.max(...fieldsGroups.map((g) => g.sortOrder ?? 0))
      : 0) + 1;

  const created = await createGroup.createEventFormFieldGroup({
    eventId: event.id,
    label,
    sortOrder: nextSortOrder,
    isActive: true,
  });

  if (!created) return;

  setNewGroupLabel("");
  onChanged?.();
}

  const isOpen = Boolean(editing);
  const editingId = editing?.id ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return draft;

    return draft.filter((f) => {
      const label = String(f.label ?? "").toLowerCase();
      const key = String(f.fieldKey ?? "").toLowerCase();
      const type = String(f.fieldType ?? "").toLowerCase();
      return label.includes(q) || key.includes(q) || type.includes(q);
    });
  }, [draft, query]);

  const groupedSections = useMemo(() => {
  const groupsSorted = [...fieldsGroups].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
  );

  const ungrouped = filtered.filter((f) => !f.groupId);

  const grouped = groupsSorted
    .map((group) => ({
      group,
      fields: filtered.filter((f) => f.groupId === group.id),
    }))
    .filter((section) => section.fields.length > 0);

  if (ungrouped.length > 0) {
    return [
      {
        group: null as EventFormFieldGroup | null,
        fields: ungrouped,
      },
      ...grouped,
    ];
  }

  return grouped;
}, [filtered, fieldsGroups]);

  const reorderDisabledTitle = isFiltering ? "Le réordonnancement est désactivé pendant une recherche." : undefined;

  const editorNode = editing ? (
    <div className="adminRegEditorCard">
      {/* Header avec croix */}
      <div className="adminRegEditorHeader">
        <div>
          <div className="adminRegEditorTitle">{creating ? "Nouveau champ" : "Modifier champ"}</div>
          <div className="adminEventHint">
            Pour <code>liste déroulante</code>/<code>radio</code> : une option par ligne.
          </div>
        </div>

        <Button variant="ghost" className="adminRegEditorClose" onClick={closeEditor} aria-label="Fermer">
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
          <div className="adminEventLabel">Groupe</div>
          <select
            className="adminEventInput"
            value={editing.groupId ?? ""}
            onChange={(e) =>
              setEditing({
                ...editing,
                groupId: e.target.value ? e.target.value : null,
              })
            }
            disabled={isSaving}
          >
            <option value="">Sans groupe</option>
            {fieldsGroups
              .filter((g) => g.isActive)
              .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
              .map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
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

        {(editing.fieldType === "select" /*|| editing.fieldType === "radio"*/) && (
          <div className="adminEventField adminEventFieldSpan2">
            <div className="adminEventLabel">Options</div>
            <textarea
              placeholder="Une option par ligne"
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
        <Button variant="secondary" onClick={closeEditor} disabled={isSaving}>
          Annuler
        </Button>

        <Button variant="primary" onClick={upsertLocalFromEditor} disabled={!editing.label.trim() || isSaving}>
          {creating ? "Ajouter" : "Enregistrer"}
        </Button>
      </div>
    </div>
  ) : null;

  function renderFieldCard(f: DraftField, mobile = false) {
  const idx = draft.findIndex((x) => x.clientId === f.clientId);

  const active = Boolean(f.isActive ?? true);
  const required = Boolean(f.isRequired ?? false);
  const type = String(f.fieldType ?? "text");
  const optsLine =
    type === "select" || type === "radio"
      ? optionsToInlineText(f.options ?? undefined, 80)
      : null;

  const animDir = moveAnim[f.clientId];
  const cardAnimClass =
    animDir === "up" ? "isMoveUp" : animDir === "down" ? "isMoveDown" : "";

  const showEditInline =
    mobile &&
    ((isOpen && !creating && editingId === f.clientId) ||
      (isClosing && closingKey === f.clientId));

  return (
    <div key={f.clientId} className={mobile ? "adminRegBlock" : undefined}>
      <div
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
          {optsLine ? <span className="adminRegOptionsInline">• {optsLine}</span> : null}
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
            disabled={isSaving || isFiltering || idx === 0}
            title={isFiltering ? reorderDisabledTitle : undefined}
            className="adminMoveBtn"
            aria-label="Monter"
            variant="secondary"
          >
            ↑
          </Button>

          <Button
            onClick={() => moveLocal(f.clientId, 1)}
            disabled={isSaving || isFiltering || idx === draft.length - 1}
            title={isFiltering ? reorderDisabledTitle : undefined}
            className="adminMoveBtn"
            aria-label="Descendre"
            variant="secondary"
          >
            ↓
          </Button>

          <Button
            variant="danger"
            className="deleteFormFieldButton"
            onClick={() => removeLocal(f.clientId)}
            disabled={isSaving}
          >
            <TrashIcon />
          </Button>
        </div>
      </div>

      {mobile && showEditInline ? (
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
}

  const showCreateInline = (isOpen && creating) || (isClosing && closingKey === "create");

  const subtitle = "Gérez les informations que les participants devront fournir lors de leur inscription à l’événement.";

  return (
    <FlexPanel
      title="Formulaire d’inscription"
      subtitle={subtitle}
      state={isDirty ? "dirty" : "default"}
      actions={
          <div className="adminRegActionsWrap">
            {/* Ligne 1 */}
            <div className="adminRegActionsRow">
              <Button
                onClick={openCreate}
                disabled={!event?.id || isSaving}
                variant="secondary"
              >
                Ajouter un champ
              </Button>

              <Button
                onClick={saveAll}
                disabled={!event?.id || !isDirty || isSaving}
              >
                {isSavingAll ? "Enregistrement…" : "Enregistrer"}
              </Button>

              {isDirty ? (
                <Button onClick={resetLocalChanges} disabled={isSaving}>
                  Annuler
                </Button>
              ) : null}
            </div>

            {/* Ligne 2 */}
            <div className="adminRegActionsRow adminRegActionsRowGroup">
              <input
                className="adminEventInput"
                placeholder="Nom du groupe…"
                value={newGroupLabel}
                onChange={(e) => setNewGroupLabel(e.target.value)}
                disabled={!event?.id || isSaving}
              />

              <Button
                onClick={handleCreateGroup}
                disabled={!event?.id || isSaving || !newGroupLabel.trim()}
                variant="secondary"
              >
                Ajouter un groupe
              </Button>
            </div>
          </div>
        }
    >
      <FilterBar query={query} onQueryChange={setQuery} placeholder="Rechercher un champ…" />

      

      {saveAllError ? <div className="adminRegSaveError">{saveAllError}</div> : null}

      {isMobile ? (
        <div className={isOpen || isClosing ? "adminRegInlineShell isEditorOpen" : "adminRegInlineShell"}>
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
            ) : filtered.length === 0 ? (
              <div className="adminEventEmpty">Aucun champ ne correspond à “{query.trim()}”.</div>
            ) : (
              groupedSections.map((section) => (
                <div
                  key={section.group?.id ?? "ungrouped"}
                  className="adminRegGroupSection"
                >
                  <div className="adminRegGroupHeader">
                    {section.group ? section.group.label : "Sans groupe"}
                  </div>

                  <div className="adminRegGroupList">
                    {section.fields.map((f) => renderFieldCard(f, false))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
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
              ) : filtered.length === 0 ? (
                <div className="adminEventEmpty">Aucun champ ne correspond à “{query.trim()}”.</div>
              ) : (
                groupedSections.map((section) => (
                  <div
                    key={section.group?.id ?? "ungrouped"}
                    className="adminRegGroupSection"
                  >
                    <div className="adminRegGroupHeader">
                      {section.group ? section.group.label : "Sans groupe"}
                    </div>

                    <div className="adminRegGroupList">
                      {section.fields.map((f) => renderFieldCard(f, true))}
                    </div>
                  </div>
                ))
              )}
            </div>
          }
          right={isOpen ? <div className="regEditorPanel isOpen">{editorNode}</div> : null}
        />
      )}

      <StickySaveBar
        show={isDirty}
        saving={isSaving}
        disableSave={!event?.id}
        onSave={saveAll}
        onCancel={resetLocalChanges}
      />
    </FlexPanel>
  );
}
