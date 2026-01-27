import { useMemo, useState } from "react";
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

type EditableEventFields = Partial<
  Pick<EventOverviewRow["event"], "title" | "isPublished" | "startsAt" | "endsAt">
> & { location?: string | null };

export default function AdminEventsPage() {
  const { events } = useOutletContext<AdminOutletContext>();

  const [newTitle, setNewTitle] = useState("");

  const { selectedRow, editingId, select, closeIf, onAnimEnd, panelClassName } =
    useEventEditorPanel(events);

  const stats = useMemo(() => {
    const active = events.length;
    const open = events.filter((e) => e.event.isPublished).length;
    const soldout = events.filter((e) => !e.event.isPublished).length;
    return { active, open, soldout };
  }, [events]);

  const updateEvent = (_id: string, _patch: EditableEventFields) => {
    void _id;
    void _patch;
  };

  const deleteEvent = (id: string) => {
    closeIf(id);
    void id;
  };

  const addEvent = () => {
    void newTitle;
  };

  const isEditorVisible = !!selectedRow;

  return (
    <>
      <AdminStats stats={stats} />

      <div className={`adminEventsShell ${isEditorVisible ? "isEditorOpen" : ""}`}>
        <div className="adminEventsLeft">
          <EventTable
            events={events}
            editingId={editingId}
            onSelect={select}
            onDelete={deleteEvent}
            newTitle={newTitle}
            setNewTitle={setNewTitle}
            onAdd={addEvent}
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
                onUpdateEvent={(patch) => updateEvent(selectedRow.event.id, patch)}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
