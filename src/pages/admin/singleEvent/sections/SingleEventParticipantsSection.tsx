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
import * as XLSX from "xlsx";

type FilterMode = "all" | "order" | `field:${string}`;

type InlineEditorProps = Omit<ComponentProps<typeof AttendeeEditorPanel>, "layout">;

export function SingleEventParticipantsSection(props: {
  data: EventDetailAdmin;
  onChanged?: () => Promise<void>;
}) {
  const { data, onChanged } = props;

  const isMobile = useIsMobile(720);

  /* -------------------- FILTER UI STATE -------------------- */
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [query, setQuery] = useState("");

  /* -------------------- EDITOR STATE -------------------- */
  const [attendeeEditorOpen, setAttendeeEditorOpen] = useState(false);
  const [attendeeEditorMode, setAttendeeEditorMode] = useState<"create" | "edit">("create");
  const [editorOrderId, setEditorOrderId] = useState<string | null>(null);
  const [editingAttendeeId, setEditingAttendeeId] = useState<string | null>(null);

  const [orderWizardOpen, setOrderWizardOpen] = useState(false);

  const [saving, setSaving] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);

  const updateAttendee = useAdminUpdateOrderAttendee({ supabase });
  const deleteOrder = useDeleteOrder({ supabase });

  /* -------------------- CONFIRM MODAL -------------------- */
  const [confirmDeleteOrderOpen, setConfirmDeleteOrderOpen] = useState(false);
  const [targetOrderId, setTargetOrderId] = useState<string | null>(null);

  /* -------------------- DATA (local mirrors) -------------------- */
  const initialAttendees = useMemo(() => data.attendees.rows, [data.attendees.rows]);
  const initialAnswers = useMemo(() => toRows<AttendeeAnswer>(data.attendeeAnswers), [data.attendeeAnswers]);
  const initialOrders = useMemo(() => data.orders.rows, [data.orders.rows]);

  const [localAttendees, setLocalAttendees] = useState<Attendee[]>(() => initialAttendees);
  const [localAnswers, setLocalAnswers] = useState<AttendeeAnswer[]>(() => initialAnswers);
  const [localOrders, setLocalOrders] = useState<OrderUI[]>(() => initialOrders);

  useEffect(() => setLocalAttendees(initialAttendees), [initialAttendees]);
  useEffect(() => setLocalAnswers(initialAnswers), [initialAnswers]);
  useEffect(() => setLocalOrders(initialOrders), [initialOrders]);

  const regFields = useMemo(() => toRows<EventFormField>(data.formFields), [data.formFields]);
  const products = useMemo(() => toRows<EventProduct>(data.products), [data.products]);

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

  /* -------------------- HELPERS -------------------- */
  const closeAttendeeEditor = useCallback(() => {
    setAttendeeEditorOpen(false);
    setEditingAttendeeId(null);
    setEditorOrderId(null);
    setEditorError(null);
  }, []);

  function openEdit(attendeeId: string, orderId: string) {
    setEditorError(null);

    setOrderWizardOpen(false); // ✅ on ferme l’autre panel
    setAttendeeEditorMode("edit");
    setEditorOrderId(orderId);
    setEditingAttendeeId(attendeeId);
    setAttendeeEditorOpen(true);
  }

  function openCreateOrder() {
    // ✅ un seul panel à droite en desktop
    closeAttendeeEditor();
    setOrderWizardOpen(true);
  }

  function closeOrderWizard() {
    setOrderWizardOpen(false);
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

  /* -------------------- DELETE ORDER -------------------- */
  function requestDeleteOrder(orderId: string) {
    deleteOrder.reset?.();
    setTargetOrderId(orderId);
    setConfirmDeleteOrderOpen(true);
  }

  async function confirmDeleteOrder() {
    if (!targetOrderId) return;

    const ok = await deleteOrder.deleteOrder({ orderId: targetOrderId });
    if (!ok) return;

    const attendeeIds = new Set(
      localAttendees.filter((a) => a.orderId === targetOrderId).map((a) => a.id)
    );

    setLocalOrders((prev) =>
      prev.filter((o) => String(getFirst(o, ["id", "orderId", "order_id"])) !== String(targetOrderId))
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
  }

  /* -------------------- INLINE EDITOR PROPS (mobile cards) -------------------- */
    const inlineEditorProps = useMemo(() => {
      const p: InlineEditorProps = {
        supabase,
        isOpen: attendeeEditorOpen,
        mode: attendeeEditorMode,
        fields: regFields,
        initialValue: initialEditorValue,
        onRequestClose: closeAttendeeEditor,
        onSubmit: handleSubmitParticipant,
        isSaving: updateAttendee.loading || saving,
        error: updateAttendee.error || editorError,

        // ✅ AJOUTS
        products,
        orderId: editorOrderId,
      };
      return p;
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

      // ✅ deps
      products,
      editorOrderId,
    ]);


  /* -------------------- LEFT CONTENT -------------------- */
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

  const eventId = String(
    getFirst(data?.event, ["id"]) ?? getFirst(data, ["eventId", "event_id"]) ?? ""
  );

  /* -------------------- RIGHT PANEL (desktop) -------------------- */
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
      onCreated={async ({ orderId, order }) => {
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
      }}
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

  function normalizeSortKey(s: string) {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // enlève accents
    .trim();
}

const handleExportXls = useCallback(() => {
  // ✅ Colonnes "fixes" (sans Participant/Détail pour éviter redondance avec Nom/Prénom)
  const fixedCols = [
    "Réf commande",
    "Statut",
    "Billet",
    "Index",
  ] as const;

  // ✅ Colonnes dynamiques = champs form (labels)
  const formCols = regFields.map((f) => (f.label?.trim() ? f.label.trim() : f.fieldKey));

  const headers = [...fixedCols, ...formCols];

  const rows = localAttendees.map((att) => {
    const orderId = String(att.orderId ?? "");
    const meta = orderMetaById.get(orderId);
    const orderRef = meta?.orderNumber ?? orderId.slice(0, 8);

    const filled = filledFieldsByAttendeeId.get(att.id) ?? [];
    const filledByKey = new Map(filled.map((x) => [x.key, x.value]));

    const row: Record<string, any> = {
      "Réf commande": orderRef,
      Statut: att.status ?? "",
      Billet: att.productNameSnapshot ?? "",
      Index: att.attendeeIndex ?? "",
      __sortKey: normalizeSortKey(computeIdentity(att.id).title ?? ""),
    };

    // met les champs form par label (et va chercher la valeur via f.key)
    for (const f of regFields) {
      const label = f.label?.trim() ? f.label.trim() : f.fieldKey;
      row[label] = filledByKey.get(f.fieldKey) ?? "";
    }

    return row;
  });

  rows.sort((a, b) => String(a.__sortKey).localeCompare(String(b.__sortKey)));
  for (const r of rows) delete r.__sortKey;

  const ws = XLSX.utils.json_to_sheet(rows, { header: headers });

  // petit confort : largeur colonnes
  ws["!cols"] = headers.map((h) => ({ wch: Math.min(Math.max(h.length, 14), 38) }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Participants");

  const safeEventTitle =
    String(getFirst(data?.event, ["title", "name"]) ?? "event")
      .trim()
      .replace(/[\\/:*?"<>|]+/g, "-")
      .slice(0, 60) || "event";

  XLSX.writeFile(wb, `participants-${safeEventTitle}.xlsx`);
}, [
  regFields,
  localAttendees,
  orderMetaById,
  filledFieldsByAttendeeId,
  computeIdentity,
  data?.event,
]);


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
            <div className="adminParticipantsHeaderRight">
            <Button variant="secondary" onClick={handleExportXls} disabled={filteredAttendees.length === 0}>
              Export XLS
            </Button>

            <Button variant="primary" onClick={openCreateOrder}>
              + Ajouter une commande
            </Button>
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


        {groups.length === 0 ? (
          <div className="adminEventEmpty">
            {query.trim() ? "Aucun résultat avec ces filtres." : "Aucune commande pour le moment."}
          </div>
        ) : isMobile ? (
          <>
            {/* MOBILE: wizard au-dessus */}
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
                  onCreated={async ({ orderId, order }) => {
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
                  }}
                />
              </div>
            ) : null}

            {leftContent}
          </>
        ) : (
          <EditorShell
            isOpen={shellOpen}
            onRequestClose={() => {
              // ferme le panel actif
              if (orderWizardOpen) closeOrderWizard();
              if (attendeeEditorOpen) closeAttendeeEditor();
            }}
            editorWidth={420}
            editorGap={14}
            stickyTop={120}
            left={leftContent}
            right={rightPanel}
          />
        )}
      </div>
    </div>
  );
}
