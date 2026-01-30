import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { ConfirmDeleteModal } from "../../ui/components/modals/ConfirmDeleteModal";
import { useNavigate } from "react-router-dom";

import "../../styles/adminEventsPage.css";

import {
  AdminStats,
  EventEditor,
  EventTable,
  useEventEditorPanel,
} from "../../features/admin";

import type { AdminOutletContext } from "./AdminDashboard";
import type { EventOverviewRow } from "../../domain/models/admin/admin.eventsOverview.schema";

import { Button } from "../../ui/components";
import { supabase } from "../../gateways/supabase/supabaseClient";
import { useCreateEvent } from "../../features/admin/hooks/useCreateEvent";
import { useUpdateEvent } from "../../features/admin/hooks/useUpdateEvent";
import { useDeleteEvent } from "../../features/admin/hooks/useDeleteEvent";
import { PlusIcon } from "../../ui/components/icon/Icons";

type EditableEventFields = Partial<
  Pick<EventOverviewRow["event"], "title" | "isPublished" | "startsAt" | "endsAt">
> & { location?: string | null };

type ConfirmState = {
  open: boolean;
  eventId: string | null;
  title: string | null;
};



export default function AdminEventsPage() {
  const { events, orgId, refetch } = useOutletContext<AdminOutletContext>();

  const {
    createEvent,
    loading: creating,
    error: createError,
    reset: resetCreate,
  } = useCreateEvent({ supabase });

  const {
    updateEvent: doUpdate,
    loading: saving,
    error: saveError,
    reset: resetSave,
  } = useUpdateEvent({ supabase });

  const {
    deleteEvent: doDelete,
    loading: deleting,
    error: deleteError,
    reset: resetDelete,
  } = useDeleteEvent({ supabase });

  const { selectedRow, editingId, select, closeIf, onAnimEnd, panelClassName } =
    useEventEditorPanel(events);

  const [confirm, setConfirm] = useState<ConfirmState>({
    open: false,
    eventId: null,
    title: null,
  });

  const stats = useMemo(() => {
    const totalEvents = events.length;
    const publishedEvents = events.filter((e) => e.event.isPublished).length;
    const draftEvents = events.filter((e) => !e.event.isPublished).length;
    return { totalEvents, publishedEvents, draftEvents };
  }, [events]);

  const updateEvent = async (id: string, patch: EditableEventFields) => {
    if (!patch || Object.keys(patch).length === 0) return;

    resetSave();

    const updated = await doUpdate({
      eventId: id,
      patch,
    });

    if (!updated) return;

    await refetch();
  };

  const deleteEvent = (id: string) => {
    resetDelete();

    const row = events.find((e) => e.event.id === id);

    setConfirm({
      open: true,
      eventId: id,
      title: row?.event.title ?? "cet événement",
    });
  };

  const cancelDelete = () => {
    resetDelete();
    setConfirm({ open: false, eventId: null, title: null });
  };

  const confirmDelete = async () => {
    if (!confirm.eventId) return;

    // UX: ferme le panel si on supprime l'event affiché
    closeIf(confirm.eventId);

    const ok = await doDelete({
      eventId: confirm.eventId,
      orgId, // optionnel si ton repo le supporte
    });

    if (!ok) return; // on laisse le modal ouvert + message

    await refetch();
    cancelDelete();
  };

  const navigate = useNavigate();


  const addEvent = async () => {
  if (creating) return;

  resetCreate();

  const created = await createEvent({
    orgId,
    title: "Nouvel événement",
    description: null,
    location: null,
    bannerUrl: null,
    depositCents: null,
    startsAt: null,
    endsAt: null,
  });

  if (!created) return;

  await refetch();

  navigate(`/admin/events/${created.slug}`);
};


  const isEditorVisible = !!selectedRow;

  return (
    <>
      <AdminStats stats={stats} />

      <div className="adminEventsActions">
        <Button
          label={creating ? "Création…" : "Nouvel événement"}
          onClick={addEvent}
          disabled={creating}
        >
          <PlusIcon />
          Nouvel événement
        </Button>
      </div>

      {(createError || saveError || deleteError) && (
        <div className="adminEventsError">
          {createError ?? saveError ?? deleteError}
        </div>
      )}

      <div
        className={`adminEventsShell ${isEditorVisible ? "isEditorOpen" : ""}`}
      >
        <div className="adminEventsLeft">
          <EventTable
            events={events}
            editingId={editingId}
            onSelect={select}
            onDelete={deleteEvent}
          />
        </div>

        {selectedRow && (
          <div className="adminEventsRight">
            <div
              className={`adminEventsEditorPanel ${panelClassName}`}
              key={selectedRow.event.id}
              onAnimationEnd={onAnimEnd}
            >
              <EventEditor
                event={selectedRow}
                onUpdateEvent={(patch) =>
                  void updateEvent(selectedRow.event.id, patch)
                }
              />
              {saving && (
                <div className="adminEventsSavingHint">Enregistrement…</div>
              )}
            </div>
          </div>
        )}
      </div>

      <ConfirmDeleteModal
        open={confirm.open}
        title="Supprimer l’événement ?"
        eventName={confirm.title}
        busy={deleting}
        error={deleteError}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
      />
    </>
  );
}
