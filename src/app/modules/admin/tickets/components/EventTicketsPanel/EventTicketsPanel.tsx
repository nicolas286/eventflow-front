import type { EventProduct, EventProducts } from "@shared/models/db/db.eventProducts.schema";
import type { CreateEventProductInput } from "@app/modules/admin/products/schemas/admin.createEventProduct.schema";
import type { UpdateEventProductPatch } from "@app/modules/admin/products/data/updateEventProductRepo";

import { Button, EditorShell, StickySaveBar, FilterBar } from "@ui/components";
import { TrashIcon } from "@ui/components/icon/Icons";
import { useMediaQuery } from "@helpers/ui";
import { formatMoney } from "@helpers/normalize";
import { nonNegInt, posInt } from "@helpers/logic";

import { useEventTicketsEditor, type TicketDraft } from "../../hooks/useEventTicketsEditor";
import { EventTicketEditorNode } from "./EventTicketEditorNode";
import { FlexPanel } from "@ui/components/panels/FlexPanel";
import { MessageBox } from "@shared/ui/components/message/MessageBox";
import { useToast } from "@shared/ui/components/toast/useToast";

type Props = {
  orgId: string;
  event: { id: string } | null;
  products: EventProducts;

  onCreate: (input: CreateEventProductInput) => Promise<void>;
  onUpdate: (input: { productId: string; patch: UpdateEventProductPatch }) => Promise<void>;
  updateLoading?: boolean;
  createLoading?: boolean;
  createError?: string | null;

  onRemove?: (productId: string) => Promise<void>;
  deleteLoading?: boolean;
  deleteError?: string | null;

  onChanged?: () => void;
};

type SaveAllSummary = {
  created: number;
  updated: number;
  deleted: number;
  activated: number;
  deactivated: number;
  reordered: boolean;
};

function buildTicketsSuccessDescription(summary: SaveAllSummary) {
  const parts: string[] = [];

  if (summary.created > 0) {
    parts.push(`${summary.created} créé${summary.created > 1 ? "s" : ""}`);
  }

  if (summary.updated > 0) {
    parts.push(`${summary.updated} modifié${summary.updated > 1 ? "s" : ""}`);
  }

  if (summary.deleted > 0) {
    parts.push(`${summary.deleted} supprimé${summary.deleted > 1 ? "s" : ""}`);
  }

  if (summary.activated > 0) {
    parts.push(`${summary.activated} activé${summary.activated > 1 ? "s" : ""}`);
  }

  if (summary.deactivated > 0) {
    parts.push(`${summary.deactivated} désactivé${summary.deactivated > 1 ? "s" : ""}`);
  }

  if (summary.reordered) {
    parts.push("ordre mis à jour");
  }

  return parts.length > 0
    ? parts.join(" · ")
    : "Les modifications ont été enregistrées.";
}

export function EventTicketsPanel(props: Props) {
  const {
    event,
    products,
    onCreate,
    onUpdate,
    onRemove,
    onChanged,
    createLoading = false,
    updateLoading = false,
    deleteLoading = false,
  } = props;

  const isMobile = useMediaQuery("(max-width: 1050px)");
  const { showToast } = useToast();

  const {
    editing,
    creating,
    isDirty,
    isSaving,
    isSavingAll,
    saveAllError,
    moveFx,
    query,
    setQuery,
    sorted,
    filtered,
    isFiltering,
    closingKey,
    isClosing,
    setEditing,
    openCreate,
    openEdit,
    closeEditor,
    moveLocal,
    toggleLocal,
    removeLocal,
    upsertLocalFromEditor,
    resetLocalChanges,
    saveAll,
    getSoldQty,
    formatStockLine,
  } = useEventTicketsEditor({
    eventId: event?.id ?? null,
    products,
    onCreate,
    onUpdate,
    onRemove,
    onChanged,
    createLoading,
    updateLoading,
    deleteLoading,
    onSaveSuccess: (summary) => {
      showToast({
        title: "Tickets enregistrés",
        description: buildTicketsSuccessDescription(summary),
        variant: "success",
        duration: 4000,
      });
    },
    onSaveError: (message) => {
      showToast({
        title: "Enregistrement impossible",
        description: message || "Impossible d’enregistrer les tickets.",
        variant: "error",
        duration: 6000,
      });
    },
  });

  const isOpen = Boolean(editing);
  const editingId = editing?.id ?? null;
  const showCreateInline = (isOpen && creating) || (isClosing && closingKey === "create");

  const editorNode = (
    <EventTicketEditorNode
      editing={editing}
      creating={creating}
      setEditing={setEditing}
      isSaving={isSaving}
      nonNegInt={nonNegInt}
      posInt={posInt}
      onApplyLocal={upsertLocalFromEditor}
      onClose={closeEditor}
    />
  );

  function renderTicketCard(t: TicketDraft, idx: number) {
    const active = Boolean(t.isActive ?? true);

    const p =
      t.id && Array.isArray(products)
        ? products.find((x: EventProduct) => String(x?.id) === String(t.id))
        : null;

    const currency = "EUR";
    const sold = getSoldQty(p);
    const stockLine = formatStockLine(sold, p?.stockQty ?? t.stockQty);

    const isFxA = moveFx?.aId === t.clientId;
    const isFxB = moveFx?.bId === t.clientId;
    const fxClass =
      moveFx && isFxA
        ? moveFx.dir === -1
          ? "isMoveUp"
          : "isMoveDown"
        : moveFx && isFxB
          ? moveFx.dir === -1
            ? "isMoveDown"
            : "isMoveUp"
          : "";

    return (
      <div
        key={t.clientId}
        className={[active ? "adminTicketCard" : "adminTicketCard isInactive", "adminReorderCard", fxClass].join(" ")}
        data-movefx={moveFx?.nonce ?? ""}
      >
        <div className="adminTicketTop">
          <div className="adminTicketTitle">{t.name || "—"}</div>
          <div className={active ? "adminTicketPill" : "adminTicketPill isOff"}>{active ? "Actif" : "Inactif"}</div>
        </div>

        <div className="adminTicketMeta">
          <span className="adminTicketStrong">{formatMoney(t.priceCents ?? 0, currency)}</span>
          <span>•</span>
          <span>Stock : {stockLine}</span>
        </div>

        <div className="adminTicketMeta">
          {t.createsAttendees ? (
            <span>
              Ce billet crée <strong>{t.attendeesPerUnit ?? 1}</strong> participant
              {(t.attendeesPerUnit ?? 1) > 1 ? "s" : ""} qui devra
              {(t.attendeesPerUnit ?? 1) > 1 ? "ont" : ""} remplir le formulaire
            </span>
          ) : (
            <span>
              Ce billet ne crée <strong>aucun participant</strong>
            </span>
          )}
        </div>

        <div className="adminTicketStats">
          <div className="adminTicketStat">
            <div className="adminTicketStatLabel">Vendus</div>
            <div className="adminTicketStatValue">{sold}</div>
          </div>
        </div>

        {t.description ? <div className="adminTicketDesc">{t.description}</div> : null}

        <div className="adminTicketActions">
          <Button variant="secondary" onClick={() => openEdit(t)} disabled={isSaving}>
            Modifier
          </Button>

          <Button variant="secondary" onClick={() => toggleLocal(t.clientId, { isActive: !active })} disabled={isSaving}>
            {active ? "Désactiver" : "Activer"}
          </Button>

          <Button
            className={["adminReorderBtn", isFxA && moveFx?.dir === -1 ? "isBumpUp" : ""].join(" ")}
            onClick={() => moveLocal(t.clientId, -1)}
            disabled={isSaving || isFiltering || idx === 0}
            aria-label={isFiltering ? "Réordonnancement désactivé pendant une recherche" : "Monter"}
            variant="secondary"
          >
            ↑
          </Button>

          <Button
            className={["adminReorderBtn", isFxA && moveFx?.dir === 1 ? "isBumpDown" : ""].join(" ")}
            onClick={() => moveLocal(t.clientId, 1)}
            disabled={isSaving || isFiltering || idx === sorted.length - 1}
            title={
              isFiltering
                ? "Réordonnancement désactivé pendant une recherche. Efface le filtre pour changer l’ordre."
                : undefined
            }
            aria-label={isFiltering ? "Réordonnancement désactivé pendant une recherche" : "Descendre"}
            variant="secondary"
          >
            ↓
          </Button>

          <Button
            variant="danger"
            onClick={() => removeLocal(t.clientId)}
            disabled={isSaving || (!onRemove && Boolean(t.id))}
            className="deleteFormFieldButton"
          >
            <TrashIcon />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <FlexPanel
      title="Tickets"
      subtitle="Créez et modifiez vos tickets, ajustez leur ordre ou leur disponibilité, puis enregistrez vos modifications."
      state={isDirty ? "dirty" : "default"}
      actions={
        <>
          <Button onClick={openCreate} disabled={!event?.id || isSaving} variant="secondary">
            Nouveau ticket
          </Button>

          <Button onClick={saveAll} disabled={!event?.id || !isDirty || isSaving}>
            {isSavingAll ? "Enregistrement…" : "Enregistrer"}
          </Button>

          {isDirty ? (
            <Button onClick={resetLocalChanges} disabled={isSaving}>
              Annuler
            </Button>
          ) : null}
        </>
      }
    >
      <FilterBar query={query} onQueryChange={setQuery} placeholder="Rechercher un ticket…" />

      {saveAllError ? <MessageBox variant="error">{saveAllError}</MessageBox> : null}

      {isMobile ? (
        <div className={isOpen || isClosing ? "adminTicketsInlineShell isEditorOpen" : "adminTicketsInlineShell"}>
          {showCreateInline ? (
            <div
              className={[
                "adminTicketsInlineEditor",
                "isCreate",
                isClosing && closingKey === "create" ? "isClosing" : "isOpen",
              ].join(" ")}
            >
              {editorNode}
            </div>
          ) : null}

          <div className="adminTicketsList">
            {sorted.length === 0 ? (
              <div className="adminEventEmpty">Aucun ticket. Clique sur “Nouveau ticket”.</div>
            ) : filtered.length === 0 ? (
              <div className="adminEventEmpty">Aucun ticket ne correspond à “{query.trim()}”.</div>
            ) : (
              filtered.map((t) => {
                const idx = sorted.findIndex((x) => x.clientId === t.clientId);
                const showEditInline =
                  (isOpen && !creating && editingId === t.clientId) || (isClosing && closingKey === t.clientId);

                return (
                  <div key={t.clientId} className="adminTicketBlock">
                    {renderTicketCard(t, idx)}

                    {showEditInline ? (
                      <div
                        className={[
                          "adminTicketsInlineEditor",
                          "isEdit",
                          isClosing && closingKey === t.clientId ? "isClosing" : "isOpen",
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
        <EditorShell
          isOpen={isOpen}
          onRequestClose={closeEditor}
          editorWidth={420}
          editorGap={14}
          stickyTop={120}
          left={
            <div className="adminTicketsList">
              {sorted.length === 0 ? (
                <div className="adminEventEmpty">Aucun ticket. Clique sur “Nouveau ticket”.</div>
              ) : filtered.length === 0 ? (
                <div className="adminEventEmpty">Aucun ticket ne correspond à “{query.trim()}”.</div>
              ) : (
                filtered.map((t) => {
                  const idx = sorted.findIndex((x) => x.clientId === t.clientId);
                  return renderTicketCard(t, idx);
                })
              )}
            </div>
          }
          right={isOpen ? editorNode : null}
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