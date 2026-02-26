import type { EventProduct, EventProducts } from "../../../../../domain/models/db/db.eventProducts.schema";
import type { CreateEventProductInput } from "../../../../../domain/models/admin/admin.createEventProduct.schema";
import type { UpdateEventProductPatch } from "../../../../../gateways/supabase/repositories/dashboard/updateEventProductRepo";

import { Button, EditorShell, StickySaveBar, FilterBar } from "../../../../../ui/components";
import { TrashIcon } from "../../../../../ui/components/icon/Icons";
import { useMediaQuery } from "../../../../../domain/helpers/ui";
import { formatMoney } from "../../../../../domain/helpers/normalize";
import { nonNegInt, posInt } from "../../../../../domain/helpers/logic";

import { useEventTicketsEditor, type TicketDraft } from "../../../hooks/useEventTicketsEditor";
import { EventTicketEditorNode } from "./EventTicketEditorNode";
import { FlexPanel } from "../../../../../ui/components/panels/FlexPanel";

type OrderItemLike = {
  eventProductId?: string | null;
  event_product_id?: string | null;
  quantity?: number | null;
  unitPriceCents?: number | null;
  unit_price_cents?: number | null;
  priceCents?: number | null;
};

type Props = {
  orgId: string;
  event: { id: string } | null;
  products: EventProducts;
  orders: unknown[];
  orderItems: OrderItemLike[];
  payments: unknown[];

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

  const {
    // state / derived
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

    // setters
    setEditing,

    // actions
    openCreate,
    openEdit,
    closeEditor,
    moveLocal,
    toggleLocal,
    removeLocal,
    upsertLocalFromEditor,
    resetLocalChanges,
    saveAll,

    // helpers
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
            <Button onClick={openCreate} disabled={!event?.id || isSaving}>
              Nouveau ticket
            </Button>

            <Button onClick={saveAll} disabled={!event?.id || !isDirty || isSaving}>
              {isSavingAll ? "Sauvegarde…" : "Sauvegarder"}
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

      {saveAllError ? <div className="adminTicketsSaveError">{saveAllError}</div> : null}

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