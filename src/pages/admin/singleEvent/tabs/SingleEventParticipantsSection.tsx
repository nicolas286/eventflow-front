import { useCallback, useEffect, useMemo, useState } from "react";
import type { ComponentProps } from "react";

import { supabase } from "../../../../gateways/supabase/supabaseClient";

import { EditorShell, Button, FilterBar } from "../../../../ui/components";
import { ConfirmModal } from "../../../../ui/components/modals/ConfirmModal";
import { useIsMobile } from "../../../../ui/useIsMobile";

import { AttendeeEditorPanel } from "../../../../features/admin/events/singleEvent/AttendeeEditorPanel";
import { AdminOrderCreateWizardPanel } from "../../../../features/admin/createOrder/AdminCreateOrderWizardPanel";
import { OrdersPeopleList } from "../../../../features/admin/ordersComponents/OrdersPeopleList";

import { useAdminUpdateOrderAttendee } from "../../../../features/admin/hooks/useUpdateOrderAttendeeAnswers";
import { useDeleteOrder } from "../../../../features/admin/hooks/useDeleteOrder";
import { useParticipantsViewModel } from "../../../../features/admin/hooks/useParticipantsViewModel";

import type { EventDetailAdmin } from "../../../../domain/models/admin/admin.eventDetail.schema";
import type { EventFormField } from "../../../../domain/models/db/db.eventFormFields.schema";
import type { EventProduct } from "../../../../domain/models/db/db.eventProducts.schema";
import type { Attendee } from "../../../../domain/models/db/db.attendee.schema";
import type { AttendeeAnswers as AttendeeAnswer } from "../../../../domain/models/db/db.attendeeAnswers.schema";
import type { OrderUI } from "../../../../domain/models/admin/admin.ordersSchema";

import { toRows } from "../../../../domain/helpers/normalize";
import { getFirst } from "../../../../domain/helpers/logic";
import { makeLocalAnswers, buildUpdateAttendeeFromForm } from "../../../../domain/helpers/attendeeAnswers";
import { exportParticipantsXls } from "../../../../features/admin/participants/exportParticipantsXls";

type FilterMode = "all" | "order" | `field:${string}`;

type InlineEditorProps = Omit<ComponentProps<typeof AttendeeEditorPanel>, "layout">;

export function SingleEventParticipantsSection(props: {
  data: EventDetailAdmin;
  onChanged?: () => Promise<void>;
}) {
  const { data, onChanged } = props;

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

  const initialAttendees = useMemo(() => data.attendees.rows, [data.attendees.rows]);
  const initialAnswers = useMemo(
    () => toRows<AttendeeAnswer>(data.attendeeAnswers),
    [data.attendeeAnswers]
  );
  const initialOrders = useMemo(() => data.orders.rows, [data.orders.rows]);

  const [localAttendees, setLocalAttendees] = useState<Attendee[]>(() => initialAttendees);
  const [localAnswers, setLocalAnswers] = useState<AttendeeAnswer[]>(() => initialAnswers);
  const [localOrders, setLocalOrders] = useState<OrderUI[]>(() => initialOrders);

  useEffect(() => setLocalAttendees(initialAttendees), [initialAttendees]);
  useEffect(() => setLocalAnswers(initialAnswers), [initialAnswers]);
  useEffect(() => setLocalOrders(initialOrders), [initialOrders]);

  const regFields = useMemo(() => toRows<EventFormField>(data.formFields), [data.formFields]);
  const products = useMemo(() => toRows<EventProduct>(data.products), [data.products]);

  const eventId = useMemo(() => {
    return String(getFirst(data?.event, ["id"]) ?? getFirst(data, ["eventId", "event_id"]) ?? "");
  }, [data]);

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
    query,
    filterMode,
  });

  /* Ferme le wizard de création de commande (utilisé par le shell et après création). */
  const closeOrderWizard = useCallback(() => {
    setOrderWizardOpen(false);
  }, []);

  /* Ferme l’éditeur participant et reset l’état associé (id/commande/error). */
  const closeAttendeeEditor = useCallback(() => {
    setAttendeeEditorOpen(false);
    setEditingAttendeeId(null);
    setEditorOrderId(null);
    setEditorError(null);
  }, []);

  /* Ferme le panel actuellement visible (wizard ou éditeur) pour garantir un seul panel actif. */
  const closeActivePanel = useCallback(() => {
    if (orderWizardOpen) closeOrderWizard();
    if (attendeeEditorOpen) closeAttendeeEditor();
  }, [orderWizardOpen, attendeeEditorOpen, closeOrderWizard, closeAttendeeEditor]);

  /* Applique l’ajout d’une commande créée : met à jour le local, filtre sur la commande, ferme le wizard et refresh. */
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
    [closeOrderWizard, onChanged]
  );

  /* Ouvre l’éditeur participant en mode édition, en s’assurant de fermer le wizard si ouvert. */
  const openEdit = useCallback(
    (attendeeId: string, orderId: string) => {
      setEditorError(null);
      closeOrderWizard();
      setAttendeeEditorMode("edit");
      setEditorOrderId(orderId);
      setEditingAttendeeId(attendeeId);
      setAttendeeEditorOpen(true);
    },
    [closeOrderWizard]
  );

  /* Ouvre le wizard de création de commande, en fermant l’éditeur participant si ouvert. */
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

  /* Soumet l’édition d’un participant : update API + mise à jour des réponses locales + fermeture + refresh. */
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
    ]
  );

  /* Ouvre la modale de confirmation de suppression d’une commande. */
  const requestDeleteOrder = useCallback(
    (orderId: string) => {
      deleteOrder.reset?.();
      setTargetOrderId(orderId);
      setConfirmDeleteOrderOpen(true);
    },
    [deleteOrder]
  );

  /* Confirme la suppression d’une commande : delete API + purge locals (orders/attendees/answers) + refresh. */
  const confirmDeleteOrder = useCallback(async () => {
    if (!targetOrderId) return;

    const ok = await deleteOrder.deleteOrder({ orderId: targetOrderId });
    if (!ok) return;

    const attendeeIds = new Set(
      localAttendees.filter((a) => a.orderId === targetOrderId).map((a) => a.id)
    );

    setLocalOrders((prev) =>
      prev.filter(
        (o) => String(getFirst(o, ["id", "orderId", "order_id"])) !== String(targetOrderId)
      )
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

  /* Props partagées pour l’éditeur inline mobile (utilisé par OrdersPeopleList). */
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
      products,
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
    products,
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
      products={products}
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
      products={products}
      orderId={editorOrderId}
      layout="shell"
    />
  ) : null;

  const shellOpen = Boolean(rightPanel);

  /* Exporte un XLS des participants confirmés en respectant les filtres et l’identité calculée. */
  const handleExportXls = useCallback(() => {
    exportParticipantsXls({
      data,
      regFields,
      localAttendees: filteredAttendees.filter((a) => a.status === "confirmed"),
      filledFieldsByAttendeeId,
      computeIdentityTitle: (attendeeId) => computeIdentity(attendeeId).title ?? "",
    });
  }, [data, regFields, filteredAttendees, filledFieldsByAttendeeId, computeIdentity]);

  return (
    <div className="adminSingleEventParticipants">
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

      <div className="adminParticipantsCard">
        <div className="adminParticipantsHeader">
          <div>
            <h3 className="adminParticipantsTitle">Commandes</h3>
            <div className="adminParticipantsHint">
              {groups.length} commande(s) • {filteredAttendees.length} participant(s)
            </div>
          </div>

          <div className="adminParticipantsHeaderRight">
            <Button
              variant="secondary"
              onClick={handleExportXls}
              disabled={filteredAttendees.length === 0}
            >
              Export XLS
            </Button>

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
              : "Recherche globale…"
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
                  products={products}
                  regFields={regFields}
                  onCreated={handleCreatedOrder}
                />
              </div>
            ) : null}

            {groups.length === 0 ? (
              <div className="adminEventEmpty">
                {query.trim()
                  ? "Aucun résultat avec ces filtres."
                  : "Aucune commande pour le moment."}
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
                        ? "Aucun résultat avec ces filtres."
                        : "Aucune commande pour le moment."}
                    </div>
                  ) : (
                    leftContent
                  )
                }
                right={rightPanel}
              />
            )}
      </div>
    </div>
  );
}