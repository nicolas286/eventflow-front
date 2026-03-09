import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentProps } from "react";

import { supabase } from "@gateways/supabase/supabaseClient";

import { EditorShell, Button, FilterBar } from "@ui/components";
import { ConfirmModal } from "@ui/components/modals/ConfirmModal";
import { useIsMobile } from "@shared/hooks/useIsMobile";

import { AttendeeEditorPanel } from "../../singleEvent/components/AttendeeEditorPanel";
import { AdminOrderCreateWizardPanel } from "./AdminCreateOrderWizardPanel";
import { OrdersPeopleList } from "./OrdersPeopleList";

import { useAdminUpdateOrderAttendee } from "../hooks/useUpdateOrderAttendeeAnswers";
import { useDeleteOrder } from "../hooks/useDeleteOrder";
import { useParticipantsViewModel } from "../hooks/useParticipantsViewModel";

import type { AdminEventDetailEvent } from "../../singleEvent/schemas/admin.eventDetail.schema";
import type { EventFormField } from "@shared/models/db/db.eventFormFields.schema";
import type { EventProducts, EventProduct } from "@shared/models/db/db.eventProducts.schema";
import type {
  AttendeeAnswers as AttendeeAnswer,
  AttendeesAnswers,
} from "@shared/models/db/db.attendeeAnswers.schema";
import type { OrderItem } from "@shared/models/db/db.orderItems.schema";
import type { OrdersUI, OrderUI } from "../schemas/admin.ordersSchema";
import type { Attendee } from "@shared/models/db/db.attendee.schema";

import { toRows } from "@helpers/normalize";
import { makeLocalAnswers, buildUpdateAttendeeFromForm } from "@helpers/attendeeAnswers";
import { exportParticipantsXls } from "../helpers/exportParticipantsXls";

import "./attendees.css";

type FilterMode = "all" | "order" | `field:${string}`;
type InlineEditorProps = Omit<ComponentProps<typeof AttendeeEditorPanel>, "layout">;

export function SingleEventOrdersSubSection(props: {
  event: AdminEventDetailEvent;
  products: EventProducts;
  formFields: EventFormField[];
  orders: OrdersUI;
  orderItems: OrderItem[];
  attendees: Attendee[];
  attendeeAnswers: AttendeesAnswers;
  ordersPage: number;
  ordersPageSize: number;
  onOrdersPageChange: (nextPage: number) => void;
  onChanged?: () => Promise<void>;
}) {
  const {
    event,
    products,
    formFields,
    orders,
    attendees,
    attendeeAnswers,
    orderItems,
    ordersPage,
    ordersPageSize,
    onOrdersPageChange,
    onChanged,
  } = props;

  const productsRows = useMemo(() => toRows<EventProduct>(products), [products]);
  const orderItemsRows = useMemo(() => toRows(orderItems), [orderItems]);
  const isMobile = useIsMobile(720);

  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [query, setQuery] = useState("");

  const [attendeeEditorOpen, setAttendeeEditorOpen] = useState(false);
  const [attendeeEditorMode, setAttendeeEditorMode] = useState<"create" | "edit">("create");
  const [editorOrderId, setEditorOrderId] = useState<string | null>(null);
  const [editingAttendeeId, setEditingAttendeeId] = useState<string | null>(null);

  const [orderWizardOpen, setOrderWizardOpen] = useState(false);

  const [saving, setSaving] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);

  const updateAttendee = useAdminUpdateOrderAttendee({ supabase });
  const deleteOrder = useDeleteOrder({ supabase });

  const [confirmDeleteOrderOpen, setConfirmDeleteOrderOpen] = useState(false);
  const [targetOrderId, setTargetOrderId] = useState<string | null>(null);

  const initialAttendees = useMemo(() => attendees, [attendees]);
  const initialAnswers = useMemo(
    () => toRows<AttendeeAnswer>(attendeeAnswers),
    [attendeeAnswers],
  );
  const initialOrders = useMemo(() => orders.rows, [orders.rows]);

  const [localAttendees, setLocalAttendees] = useState<Attendee[]>(() => initialAttendees);
  const [localAnswers, setLocalAnswers] = useState<AttendeeAnswer[]>(() => initialAnswers);
  const [localOrders, setLocalOrders] = useState<OrderUI[]>(() => initialOrders);

  useEffect(() => setLocalAttendees(initialAttendees), [initialAttendees]);
  useEffect(() => setLocalAnswers(initialAnswers), [initialAnswers]);
  useEffect(() => setLocalOrders(initialOrders), [initialOrders]);

  const regFields = useMemo(() => toRows<EventFormField>(formFields), [formFields]);

  const eventId = event.id ?? "";

  const {
    orderMetaById,
    filledFieldsByAttendeeId,
    fieldOptions,
    filteredAttendees,
    groups,
    computeIdentity,
  } = useParticipantsViewModel({
    localAttendees,
    localAnswers,
    localOrders,
    localOrderItems: orderItemsRows,
    productsRows,
    query,
    filterMode,
  });

  const totalOrders = orders.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalOrders / ordersPageSize));
  const safePage = Math.min(ordersPage, totalPages - 1);
  const canGoPrev = safePage > 0;
  const canGoNext = safePage < totalPages - 1;

  const closeOrderWizard = useCallback(() => {
    setOrderWizardOpen(false);
  }, []);

  const closeAttendeeEditor = useCallback(() => {
    setAttendeeEditorOpen(false);
    setEditingAttendeeId(null);
    setEditorOrderId(null);
    setEditorError(null);
  }, []);

  const closeActivePanel = useCallback(() => {
    if (orderWizardOpen) closeOrderWizard();
    if (attendeeEditorOpen) closeAttendeeEditor();
  }, [orderWizardOpen, attendeeEditorOpen, closeOrderWizard, closeAttendeeEditor]);

  const handleCreatedOrder = useCallback(
    async ({ orderId, order }: { orderId: string; order: unknown }) => {
      setLocalOrders((prev) => {
        const exists = prev.some((o) => o.id === orderId);
        if (exists) return prev;
        return [order as OrderUI, ...prev];
      });

      const orderNumber = orderId.slice(0, 8);
      setFilterMode("order");
      setQuery(String(orderNumber));

      closeOrderWizard();
      await onChanged?.().catch(() => {});
    },
    [closeOrderWizard, onChanged],
  );

  const openEdit = useCallback(
    (attendeeId: string, orderId: string) => {
      setEditorError(null);
      closeOrderWizard();
      setAttendeeEditorMode("edit");
      setEditorOrderId(orderId);
      setEditingAttendeeId(attendeeId);
      setAttendeeEditorOpen(true);
    },
    [closeOrderWizard],
  );

  const openCreateOrder = useCallback(() => {
    closeAttendeeEditor();
    setOrderWizardOpen(true);
  }, [closeAttendeeEditor]);

  const initialEditorValue = useMemo(() => {
    const base: Record<string, unknown> = {};
    if (!editingAttendeeId) return base;

    const filled = filledFieldsByAttendeeId.get(editingAttendeeId) ?? [];
    for (const f of filled) base[f.key] = f.value;
    return base;
  }, [editingAttendeeId, filledFieldsByAttendeeId]);

  const handleSubmitParticipant = useCallback(
    async (value: Record<string, unknown>) => {
      try {
        setSaving(true);
        setEditorError(null);

        if (attendeeEditorMode !== "edit" || !editingAttendeeId) {
          closeAttendeeEditor();
          return;
        }

        const attendee = {
          answers: buildUpdateAttendeeFromForm({ regFields, value }).answers,
        };

        const res = await updateAttendee.updateOrderAttendee({
          attendeeId: editingAttendeeId,
          attendee,
        });

        if (!res) {
          setEditorError(updateAttendee.error ?? "Impossible de modifier le participant");
          return;
        }

        const nextAnswers = makeLocalAnswers({
          attendeeId: editingAttendeeId,
          regFields,
          value,
        });

        setLocalAnswers((prev) => {
          const kept = prev.filter((a) => a.attendeeId !== editingAttendeeId);
          return [...nextAnswers, ...kept];
        });

        closeAttendeeEditor();
        await onChanged?.().catch(() => {});
      } catch (e: unknown) {
        setEditorError(e instanceof Error ? e.message : "Erreur inconnue");
      } finally {
        setSaving(false);
      }
    },
    [
      attendeeEditorMode,
      editingAttendeeId,
      regFields,
      updateAttendee,
      onChanged,
      closeAttendeeEditor,
    ],
  );

  const requestDeleteOrder = useCallback(
    (orderId: string) => {
      deleteOrder.reset?.();
      setTargetOrderId(orderId);
      setConfirmDeleteOrderOpen(true);
    },
    [deleteOrder],
  );

  const confirmDeleteOrder = useCallback(async () => {
    if (!targetOrderId) return;

    const ok = await deleteOrder.deleteOrder({ orderId: targetOrderId });
    if (!ok) return;

    const attendeeIds = new Set(
      localAttendees.filter((a) => a.orderId === targetOrderId).map((a) => a.id),
    );

    setLocalOrders((prev) =>
      prev.filter((o) => String(o.id) !== String(targetOrderId)),
    );
    setLocalAttendees((prev) => prev.filter((a) => a.orderId !== targetOrderId));
    setLocalAnswers((prev) => prev.filter((ans) => !attendeeIds.has(ans.attendeeId)));

    if (editorOrderId === targetOrderId) closeAttendeeEditor();

    setConfirmDeleteOrderOpen(false);
    setTargetOrderId(null);

    try {
      await onChanged?.();
    } catch (e) {
      console.warn("[participants] onChanged failed", e);
      setEditorError("La suppression est faite, mais le rafraîchissement a échoué.");
    }
  }, [
    targetOrderId,
    deleteOrder,
    localAttendees,
    editorOrderId,
    closeAttendeeEditor,
    onChanged,
  ]);

  const inlineEditorProps = useMemo((): InlineEditorProps => {
    return {
      supabase,
      isOpen: attendeeEditorOpen,
      mode: attendeeEditorMode,
      fields: regFields,
      initialValue: initialEditorValue,
      onRequestClose: closeAttendeeEditor,
      onSubmit: handleSubmitParticipant,
      isSaving: updateAttendee.loading || saving,
      error: updateAttendee.error || editorError,
      products: productsRows,
      orderId: editorOrderId,
    };
  }, [
    attendeeEditorOpen,
    attendeeEditorMode,
    regFields,
    initialEditorValue,
    closeAttendeeEditor,
    handleSubmitParticipant,
    updateAttendee.loading,
    updateAttendee.error,
    saving,
    editorError,
    productsRows,
    editorOrderId,
  ]);

  const leftContent = (
    <OrdersPeopleList
      groups={groups}
      orderMetaById={orderMetaById}
      filledFieldsByAttendeeId={filledFieldsByAttendeeId}
      computeIdentity={computeIdentity}
      isMobile={isMobile}
      targetOrderId={targetOrderId}
      deleteOrderLoading={deleteOrder.loading}
      onRequestDeleteOrder={requestDeleteOrder}
      editorOpen={attendeeEditorOpen}
      editingAttendeeId={editingAttendeeId}
      inlineEditorProps={inlineEditorProps}
      onOpenEdit={openEdit}
    />
  );

  const rightPanel = orderWizardOpen ? (
    <AdminOrderCreateWizardPanel
      isOpen={orderWizardOpen}
      onRequestClose={closeOrderWizard}
      stickyTop={120}
      editorWidth={420}
      editorGap={14}
      left={<div style={{ display: "none" }} />}
      eventId={eventId}
      products={productsRows}
      regFields={regFields}
      onCreated={handleCreatedOrder}
    />
  ) : attendeeEditorOpen ? (
    <AttendeeEditorPanel
      supabase={supabase}
      isOpen={attendeeEditorOpen}
      mode={attendeeEditorMode}
      fields={regFields}
      initialValue={initialEditorValue}
      onRequestClose={closeAttendeeEditor}
      onSubmit={handleSubmitParticipant}
      isSaving={updateAttendee.loading || saving}
      error={updateAttendee.error || editorError}
      products={productsRows}
      orderId={editorOrderId}
      layout="shell"
    />
  ) : null;

  const shellOpen = Boolean(rightPanel);

  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);

  const confirmedAttendees = useMemo(() => {
    return filteredAttendees.filter((a) => a.status === "confirmed");
  }, [filteredAttendees]);

  const doExportXls = useCallback(
    async (
      sortMode: "alpha" | "orderRef",
      stripeMode: "row" | "order" = "order",
    ) => {
      try {
        await exportParticipantsXls({
          eventTitle: event.title,
          regFields,
          localAttendees: confirmedAttendees,
          filledFieldsByAttendeeId,
          computeIdentityTitle: (attendeeId) => computeIdentity(attendeeId).title ?? "",
          sortMode,
          stripeMode,
        });
      } catch (err) {
        console.error("[participants] export XLS failed", err);
      }
    },
    [
      event.title,
      regFields,
      confirmedAttendees,
      filledFieldsByAttendeeId,
      computeIdentity,
    ],
  );

  const toggleExportMenu = useCallback(() => {
    if (confirmedAttendees.length === 0) return;
    setExportMenuOpen((v) => !v);
  }, [confirmedAttendees.length]);

  useEffect(() => {
    if (!exportMenuOpen) return;

    function onMouseDown(e: MouseEvent) {
      const el = exportMenuRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) {
        setExportMenuOpen(false);
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setExportMenuOpen(false);
    }

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [exportMenuOpen]);

  return (
    <>
      <ConfirmModal
        isOpen={confirmDeleteOrderOpen}
        title="Supprimer la commande ?"
        intent="danger"
        confirmLabel="Supprimer la commande"
        confirmLoadingLabel="Suppression…"
        loading={deleteOrder.loading}
        error={deleteOrder.error}
        onCancel={() => {
          if (deleteOrder.loading) return;
          setConfirmDeleteOrderOpen(false);
          setTargetOrderId(null);
          deleteOrder.reset?.();
        }}
        onConfirm={confirmDeleteOrder}
      >
        Attention : la commande et tous ses participants seront supprimés.
      </ConfirmModal>

      <div className="adminParticipantsHeader">
        <div>
          <h3 className="adminParticipantsTitle">Commandes</h3>
          <div className="adminParticipantsHint">
            {groups.length} commande(s) • {filteredAttendees.length} participant(s)
            {query.trim() || filterMode !== "all"
              ? ` sur cette page • ${totalOrders} commande(s) au total`
              : ` • ${totalOrders} commande(s) au total`}
          </div>
        </div>

        <div className="adminParticipantsHeaderRight">
          <div className="adminExportMenu" ref={exportMenuRef}>
            <Button
              variant="secondary"
              onClick={toggleExportMenu}
              disabled={confirmedAttendees.length === 0}
            >
              Export XLS (page)
            </Button>

            {exportMenuOpen ? (
              <div className="adminExportMenuDropdown" role="menu" aria-label="Options export XLS">
                <button
                  type="button"
                  className="adminExportMenuItem"
                  role="menuitem"
                  onClick={() => {
                    setExportMenuOpen(false);
                    void doExportXls("alpha", "row");
                  }}
                >
                  Trier par nom (A→Z)
                </button>

                <button
                  type="button"
                  className="adminExportMenuItem"
                  role="menuitem"
                  onClick={() => {
                    setExportMenuOpen(false);
                    void doExportXls("orderRef", "order");
                  }}
                >
                  Trier par commande (réf + index)
                </button>
              </div>
            ) : null}
          </div>

          <Button variant="primary" onClick={openCreateOrder}>
            + Ajouter une commande
          </Button>
        </div>
      </div>

      <FilterBar
        query={query}
        onQueryChange={setQuery}
        selectValue={filterMode}
        onSelectChange={(v) => setFilterMode(v as FilterMode)}
        placeholder={
          filterMode === "order"
            ? "Rechercher par numéro de commande…"
            : filterMode.startsWith("field:")
              ? "Rechercher dans le champ sélectionné…"
              : "Recherche globale (sur cette page)…"
        }
        selectOptions={[
          { value: "all", label: "Tous" },
          { value: "order", label: "Commande" },
          ...fieldOptions.map((f) => ({
            value: `field:${f.key}`,
            label: f.label,
            group: "Champs participant",
          })),
        ]}
      />

      {totalOrders > 0 ? (
        <div className="adminListPager">
          <Button
            variant="secondary"
            disabled={!canGoPrev}
            onClick={() => onOrdersPageChange(Math.max(0, safePage - 1))}
          >
            Précédent
          </Button>

          <div className="adminListPager__label">
            Page {safePage + 1} / {totalPages} — {localOrders.length} commande(s) chargée(s)
          </div>

          <Button
            variant="secondary"
            disabled={!canGoNext}
            onClick={() => onOrdersPageChange(Math.min(totalPages - 1, safePage + 1))}
          >
            Suivant
          </Button>
        </div>
      ) : null}

      {isMobile ? (
        <>
          {orderWizardOpen ? (
            <div className="adminInlineOrderWizard">
              <AdminOrderCreateWizardPanel
                isOpen={orderWizardOpen}
                onRequestClose={closeOrderWizard}
                stickyTop={120}
                editorWidth={420}
                editorGap={14}
                left={<div style={{ display: "none" }} />}
                eventId={eventId}
                products={productsRows}
                regFields={regFields}
                onCreated={handleCreatedOrder}
              />
            </div>
          ) : null}

          {groups.length === 0 ? (
            <div className="adminEventEmpty">
              {query.trim()
                ? "Aucun résultat avec ces filtres sur cette page."
                : "Aucune commande pour le moment sur cette page."}
            </div>
          ) : (
            leftContent
          )}
        </>
      ) : (
        <EditorShell
          isOpen={shellOpen}
          onRequestClose={closeActivePanel}
          editorWidth={420}
          editorGap={14}
          stickyTop={120}
          left={
            groups.length === 0 ? (
              <div className="adminEventEmpty">
                {query.trim()
                  ? "Aucun résultat avec ces filtres sur cette page."
                  : "Aucune commande pour le moment sur cette page."}
              </div>
            ) : (
              leftContent
            )
          }
          right={rightPanel}
        />
      )}
    </>
  );
}