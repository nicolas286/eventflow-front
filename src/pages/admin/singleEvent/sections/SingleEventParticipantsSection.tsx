import { useCallback, useEffect, useMemo, useState } from "react";
import type { ComponentProps } from "react";

import Button from "../../../../ui/components/button/Button";
import { supabase } from "../../../../gateways/supabase/supabaseClient";

import {
  AttendeeEditorPanel,
} from "../../../../features/admin/events/singleEvent/AttendeeEditorPanel";
import { AdminOrderCreateWizardPanel } from "../../../../features/admin/createOrder/AdminCreateOrderWizardPanel";

import { useAdminUpdateOrderAttendee } from "../../../../features/admin/hooks/useUpdateOrderAttendeeAnswers";
import { useDeleteOrder } from "../../../../features/admin/hooks/useDeleteOrder";
import { useParticipantsViewModel } from "../../../../features/admin/hooks/useParticipantsViewModel";

import { useIsMobile } from "../../../../ui/useIsMobile";
import { ConfirmModal } from "../../../../ui/components/modals/ConfirmModal";

import type { Attendee } from "../../../../domain/models/db/db.attendee.schema";
import type { AttendeeAnswers as AttendeeAnswer } from "../../../../domain/models/db/db.attendeeAnswers.schema";

import { toRows } from "../../../../domain/helpers/normalize";
import { getFirst } from "../../../../domain/helpers/logic";

import { makeLocalAnswers, buildUpdateAttendeeFromForm } from "../../../../domain/helpers/attendeeAnswers";
import { OrdersPeopleList } from "../../../../features/admin/ordersComponents/OrdersPeopleList";

import type { EventDetailAdmin } from "../../../../domain/models/admin/admin.eventDetail.schema";
import type { EventFormFieldUI } from "../../../../domain/models/db/db.eventFormFields.schema";
import type { EventProduct } from "../../../../domain/models/db/db.eventProducts.schema";
import type { OrderUI } from "../../../../domain/models/admin/admin.ordersSchema";

type FilterMode = "all" | "order" | `field:${string}`;

type InlineEditorProps = Omit<
  ComponentProps<typeof AttendeeEditorPanel>,
  "layout" | "stickyTop" | "editorWidth" | "editorGap" | "left"
>;

export function SingleEventParticipantsSection(props: { data: EventDetailAdmin; onChanged?: () => Promise<void> }) {
  const { data, onChanged } = props;

  const isMobile = useIsMobile(720);

  /* -------------------- FILTER UI STATE -------------------- */
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [query, setQuery] = useState("");

  /* -------------------- EDITOR STATE (ATTENDEE) -------------------- */
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create");
  const [editorOrderId, setEditorOrderId] = useState<string | null>(null);
  const [editingAttendeeId, setEditingAttendeeId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);
  const updateAttendee = useAdminUpdateOrderAttendee({ supabase });

  /* -------------------- DELETE HOOKS -------------------- */
  const deleteOrder = useDeleteOrder({ supabase });

  /* -------------------- CONFIRM MODALS STATE -------------------- */
  const [confirmDeleteOrderOpen, setConfirmDeleteOrderOpen] = useState(false);
  const [targetOrderId, setTargetOrderId] = useState<string | null>(null);

  /* -------------------- EDITOR STATE (ORDER) -------------------- */
  const [orderEditorOpen, setOrderEditorOpen] = useState(false);

  /* -------------------- DATA -------------------- */
  const initialAttendees = useMemo(() => data.attendees.rows, [data.attendees.rows]);
  const initialAnswers = useMemo(() => toRows<AttendeeAnswer>(data.attendeeAnswers), [data.attendeeAnswers]);
  const initialOrders = useMemo(() => data.orders.rows, [data.orders.rows]);

  const [localAttendees, setLocalAttendees] = useState<Attendee[]>(() => initialAttendees);
  const [localAnswers, setLocalAnswers] = useState<AttendeeAnswer[]>(() => initialAnswers);
  const [localOrders, setLocalOrders] = useState<OrderUI[]>(() => initialOrders);

  useEffect(() => setLocalAttendees(initialAttendees), [initialAttendees]);
  useEffect(() => setLocalAnswers(initialAnswers), [initialAnswers]);
  useEffect(() => setLocalOrders(initialOrders), [initialOrders]);

  const regFields = useMemo(
    () => toRows<EventFormFieldUI>(data.formFields),
    [data.formFields]
  );


  const { orderMetaById, filledFieldsByAttendeeId, fieldOptions, filteredAttendees, groups, computeIdentity } =
    useParticipantsViewModel({
      localAttendees,
      localAnswers,
      localOrders,
      query,
      filterMode,
    });

  /* -------------------- EDITOR HELPERS -------------------- */
  function openEdit(attendeeId: string, orderId: string) {
    setEditorError(null);
    setEditorMode("edit");
    setEditorOrderId(orderId);
    setEditingAttendeeId(attendeeId);

    setOrderEditorOpen(false);
    setEditorOpen(true);
  }

  const closeEditor = useCallback(() => {
  setEditorOpen(false);
  setEditingAttendeeId(null);
  setEditorOrderId(null);
  setEditorError(null);
}, []);


  function openCreateOrder() {
    closeEditor();
    setOrderEditorOpen(true);
  }

  function closeOrderEditor() {
    setOrderEditorOpen(false);
  }

  const initialEditorValue = useMemo(() => {
    const base: Record<string, unknown> = {};
    if (editingAttendeeId) {
      const filled = filledFieldsByAttendeeId.get(editingAttendeeId) ?? [];
      for (const f of filled) base[f.key] = f.value;
    }
    return base;
  }, [editingAttendeeId, filledFieldsByAttendeeId]);

  const handleSubmitParticipant = useCallback(
  async (value: Record<string, unknown>) => {
    try {
      setSaving(true);
      setEditorError(null);

      if (editorMode !== "edit" || !editingAttendeeId) {
        closeEditor();
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

      closeEditor();

      if (onChanged) {
        try {
          await onChanged();
        } catch {
          // volontairement silencieux
        }
      }
    } catch (e: unknown) {
      setEditorError(
        e instanceof Error ? e.message : "Erreur inconnue"
      );
    } finally {
      setSaving(false);
    }
  },
  [
    editorMode,
    editingAttendeeId,
    regFields,
    updateAttendee,
    onChanged,
    closeEditor,
  ]
);

  /* -------------------- DELETE ACTIONS -------------------- */
  function requestDeleteOrder(orderId: string) {
    deleteOrder.reset?.();
    setTargetOrderId(orderId);
    setConfirmDeleteOrderOpen(true);
  }

  async function confirmDeleteOrder() {
    if (!targetOrderId) return;

    const ok = await deleteOrder.deleteOrder({ orderId: targetOrderId });
    if (!ok) return;

    const attendeeIds = new Set(localAttendees.filter((a) => a.orderId === targetOrderId).map((a) => a.id));

    setLocalOrders((prev) =>
      prev.filter((o) => String(getFirst(o, ["id", "orderId", "order_id"])) !== String(targetOrderId))
    );
    setLocalAttendees((prev) => prev.filter((a) => a.orderId !== targetOrderId));
    setLocalAnswers((prev) => prev.filter((ans) => !attendeeIds.has(ans.attendeeId)));

    if (editorOrderId === targetOrderId) closeEditor();

    setConfirmDeleteOrderOpen(false);
    setTargetOrderId(null);

    if (onChanged) {
  try {
    await onChanged();
  } catch (e) {
    console.warn("[participants] onChanged failed", e);
    setEditorError("La suppression est faite, mais le rafraîchissement a échoué.");
  }
}
  }

  /* -------------------- INLINE EDITOR PROPS (typed) -------------------- */
  const inlineEditorProps = useMemo(() => {
    const p: InlineEditorProps = {
      supabase,
      isOpen: editorOpen,
      mode: editorMode,
      fields: regFields,
      initialValue: initialEditorValue,
      onRequestClose: closeEditor,
      onSubmit: handleSubmitParticipant,
      isSaving: updateAttendee.loading || saving,
      error: updateAttendee.error || editorError,
      products: toRows(data.products),
      orderId: editorOrderId,
    };
    return p;
  }, [
    editorOpen,
    editorMode,
    regFields,
    initialEditorValue,
    updateAttendee.loading,
    updateAttendee.error,
    saving,
    editorError,
    data.products,
    editorOrderId,
    handleSubmitParticipant, 
    closeEditor
  ]);

  /* -------------------- LEFT CONTENT (list extracted) -------------------- */
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
      editorOpen={editorOpen}
      editingAttendeeId={editingAttendeeId}
      inlineEditorProps={inlineEditorProps}
      onOpenEdit={openEdit}
    />
  );

  /* -------------------- RENDER -------------------- */
  return (
    <div className="adminParticipants adminSingleEventParticipants">
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
          </div>
        </div>

        <div className="adminParticipantsHeaderRight">
          <Button variant="primary" onClick={openCreateOrder}>
            + Ajouter une commande
          </Button>
        </div>
      </div>

      <div className="adminParticipantsSearch">
        <select
          className="adminSearchSelect"
          value={filterMode}
          onChange={(e) => setFilterMode(e.target.value as FilterMode)}
        >
          <option value="all">Tous</option>
          <option value="order">Commande</option>

          {fieldOptions.length > 0 ? (
            <optgroup label="Champs participant">
              {fieldOptions.map((f) => (
                <option key={f.key} value={`field:${f.key}`}>
                  {f.label}
                </option>
              ))}
            </optgroup>
          ) : null}
        </select>

        <input
          className="adminSearchInput"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            filterMode === "order"
              ? "Rechercher par numéro de commande…"
              : filterMode.startsWith("field:")
              ? "Rechercher dans le champ sélectionné…"
              : "Recherche globale…"
          }
        />

        {query.trim() ? (
          <Button variant="ghost" onClick={() => setQuery("")}>
            Réinitialiser
          </Button>
        ) : null}
      </div>

     {groups.length === 0 ? (
  <div className="adminEventEmpty">
    {query.trim() ? "Aucun résultat avec ces filtres." : "Aucune commande pour le moment."}
  </div>
) : isMobile ? (
  <>
    {/* ✅ MOBILE: wizard AU-DESSUS des commandes */}
    {orderEditorOpen ? (
      <div className="adminInlineOrderWizard">
        <AdminOrderCreateWizardPanel
          isOpen={orderEditorOpen}
          onRequestClose={closeOrderEditor}
          stickyTop={84}
          editorWidth={420}
          editorGap={14}
          left={<div style={{ display: "none" }} />}
          eventId={String(getFirst(data?.event, ["id"]) ?? getFirst(data, ["eventId", "event_id"]) ?? "")}
          products={toRows<EventProduct>(data.products)}
          regFields={regFields}
          onCreated={async ({ orderId, order }) => {
          setLocalOrders((prev) => {
            const exists = prev.some((o) => o.id === orderId);
            if (exists) return prev;
            return [order as OrderUI, ...prev];
          });

          const orderNumber = orderId.slice(0, 8);
          setFilterMode("order");
          setQuery(String(orderNumber));

          closeOrderEditor();
          await onChanged?.().catch(() => {});
          }}
        />
      </div>
    ) : null}

    {/* ✅ MOBILE: la liste (avec inline editor dans la carte) */}
    {leftContent}
  </>
) : (
  <>
    {/* ✅ DESKTOP: wizard en shell à droite, liste à gauche */}
    <AdminOrderCreateWizardPanel
      isOpen={orderEditorOpen}
      onRequestClose={closeOrderEditor}
      stickyTop={84}
      editorWidth={420}
      editorGap={14}
      left={leftContent}
      eventId={String(getFirst(data?.event, ["id"]) ?? getFirst(data, ["eventId", "event_id"]) ?? "")}
      products={toRows<EventProduct>(data.products)}
      regFields={regFields}
      onCreated={async ({ orderId, order }) => {
        setLocalOrders((prev) => {
          const exists = prev.some((o) => o.id === orderId);
          if (exists) return prev;
          return [order as OrderUI, ...prev];
        });

        const orderNumber = orderId.slice(0, 8);
        setFilterMode("order");
        setQuery(String(orderNumber));

        closeOrderEditor();
        await onChanged?.().catch(() => {});
        }}

    />

    {/* ✅ DESKTOP: panel participant à droite */}
    <AttendeeEditorPanel
      supabase={supabase}
      isOpen={editorOpen}
      mode={editorMode}
      fields={regFields}
      initialValue={initialEditorValue}
      onRequestClose={closeEditor}
      onSubmit={handleSubmitParticipant}
      isSaving={updateAttendee.loading || saving}
      error={updateAttendee.error || editorError}
      stickyTop={84}
      editorWidth={420}
      editorGap={14}
      products={toRows(data.products)}
      orderId={editorOrderId}
      left={leftContent}
      layout="shell"
    />
  </>
)}

    </div>
  );
}
