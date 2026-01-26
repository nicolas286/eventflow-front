import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";

import Container from "../../ui/components/container/Container";
import Card, { CardBody, CardHeader } from "../../ui/components/card/Card";

import { AdminStats, EventTable, EventEditor } from "../../features/admin";
import type { AdminOutletContext } from "./AdminDashboard";
import type { EventOverviewRow } from "../../domain/models/eventOverviewRow.schema";

export default function AdminEventsPage() {
  const { events } = useOutletContext<AdminOutletContext>();

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");

  const firstId = events.length > 0 ? events[0].event.id : null;

  const effectiveSelectedId = useMemo(() => {
    if (!selectedEventId) return firstId;
    const exists = events.some((e) => e.event.id === selectedEventId);
    return exists ? selectedEventId : firstId;
  }, [selectedEventId, events, firstId]);

  const selectedRow: EventOverviewRow | null = useMemo(() => {
    if (!effectiveSelectedId) return null;
    return events.find((e) => e.event.id === effectiveSelectedId) ?? null;
  }, [events, effectiveSelectedId]);

  // Stats : publié vs brouillon (pas de "status")
  const stats = useMemo(() => {
    const active = events.length;
    const open = events.filter((e) => e.event.isPublished).length; // publié
    const soldout = events.filter((e) => !e.event.isPublished).length; // brouillon
    return { active, open, soldout };
  }, [events]);

  const updateEvent = (
    _id: string,
    _patch: Partial<Pick<EventOverviewRow["event"], "title" | "isPublished">>
  ) => {
    // TODO RPC
  };

  const deleteEvent = (id: string) => {
    if (effectiveSelectedId === id) setSelectedEventId(null);
    // TODO RPC
  };

  const addEvent = () => {
    void newTitle;
    // TODO RPC
  };

  return (
    <Container>
      <AdminStats
        stats={{
          active: stats.active,
          open: stats.open, // publié
          soldout: stats.soldout, // brouillon
        }}
      />

      <div className="adminEventsGrid">
        <div className="adminEventsLeft">
          <Card>
            <CardHeader title="Événements" />
            <CardBody>
              <EventTable
                events={events}
                editingId={effectiveSelectedId ?? undefined}
                onSelect={setSelectedEventId}
                onDelete={deleteEvent}
                newTitle={newTitle}
                setNewTitle={setNewTitle}
                onAdd={addEvent}
              />
            </CardBody>
          </Card>
        </div>

        <div className="adminEventsRight">
          <Card>
            <CardHeader title="Éditeur d’événement" />
            <CardBody>
              <EventEditor
                event={selectedRow}
                onUpdateEvent={(patch) =>
                  effectiveSelectedId && updateEvent(effectiveSelectedId, patch)
                }
              />
            </CardBody>
          </Card>
        </div>
      </div>
    </Container>
  );
}
