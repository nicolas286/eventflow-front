import { useMemo } from "react";
import { useOutletContext } from "react-router-dom";

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

type EditableEventFields = Partial<
  Pick<EventOverviewRow["event"], "title" | "isPublished" | "startsAt" | "endsAt">
> & { location?: string | null };

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

  const { selectedRow, editingId, select, closeIf, onAnimEnd, panelClassName } =
    useEventEditorPanel(events);

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
    closeIf(id);
    void id;
  };

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

    await refetch(); // récupère la liste à jour
    select(created.id); // ouvre l’éditeur sur le nouvel event
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
        />
      </div>

      {(createError || saveError) && (
        <div className="adminEventsError">{createError ?? saveError}</div>
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
    </>
  );
}
