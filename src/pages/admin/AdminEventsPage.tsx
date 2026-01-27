import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";

import "../../styles/adminEventsPage.css";

import { AdminStats, EventTable, EventEditor } from "../../features/admin";
import type { AdminOutletContext } from "./AdminDashboard";
import type { EventOverviewRow } from "../../domain/models/admin/admin.eventsOverview.schema";

export default function AdminEventsPage() {
  const { events } = useOutletContext<AdminOutletContext>();

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [editorEventId, setEditorEventId] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  useEffect(() => {
    if (selectedEventId) {
      setEditorEventId(selectedEventId);
      setIsClosing(false);
    }
  }, [selectedEventId]);

  const selectedRow: EventOverviewRow | null = useMemo(() => {
    if (!editorEventId) return null;
    return events.find((e) => e.event.id === editorEventId) ?? null;
  }, [events, editorEventId]);

  const stats = useMemo(() => {
    const active = events.length;
    const open = events.filter((e) => e.event.isPublished).length;
    const soldout = events.filter((e) => !e.event.isPublished).length;
    return { active, open, soldout };
  }, [events]);

  const updateEvent = (
    _id: string,
    _patch: Partial<Pick<EventOverviewRow["event"], "title" | "isPublished">>
  ) => {
    void _id;
    void _patch;
  };

  const deleteEvent = (id: string) => {
    if (editorEventId === id) {
      setIsClosing(true);
      setSelectedEventId(null);
    }
    void id;
  };

  const addEvent = () => {
    void newTitle;
  };

  const handleSelect = (id: string) => {
    if (editorEventId === id) {
      setIsClosing(true);
      setSelectedEventId(null);
      return;
    }
    setSelectedEventId(id);
  };

  const handleEditorAnimEnd = () => {
    if (isClosing) {
      setIsClosing(false);
      setEditorEventId(null);
    }
  };

  return (
    <>
      <AdminStats stats={stats} />

      <div className="adminEventsGrid">
        <div className="adminEventsLeft">
          <EventTable
            events={events}
            editingId={editorEventId ?? undefined}
            onSelect={handleSelect}
            onDelete={deleteEvent}
            newTitle={newTitle}
            setNewTitle={setNewTitle}
            onAdd={addEvent}
          />
        </div>

        {selectedRow && (
          <div className="adminEventsRight">
            <div
              className={`adminEventsEditorPanel ${
                isClosing ? "isClosing" : "isOpen"
              }`}
              key={editorEventId ?? "editor"}
              onAnimationEnd={handleEditorAnimEnd}
            >
              <EventEditor
                event={selectedRow}
                onUpdateEvent={(patch) =>
                  (editorEventId && updateEvent(editorEventId, patch)) || undefined
                }
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
