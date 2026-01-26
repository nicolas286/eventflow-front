import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";

import Container from "../../ui/components/container/Container";
import Card, { CardBody, CardHeader } from "../../ui/components/card/Card";

import { AdminStats, EventTable, EventEditor } from "../../features/admin";
import type { AdminOutletContext } from "./AdminDashboard";

export default function AdminEventsPage() {
  const { events } = useOutletContext<AdminOutletContext>();

  const [selectedEventId, setSelectedEventId] = useState<string | null>(events?.[0]?.id ?? null);
  const [newTitle, setNewTitle] = useState("");

  const selectedEvent = useMemo(
    () => (selectedEventId ? events.find((e: any) => e.id === selectedEventId) ?? null : null),
    [events, selectedEventId]
  );

  const stats = useMemo(() => {
    const active = events.length;
    const open = events.filter((e: any) => e.status === "open").length;
    const soldout = events.filter((e: any) => e.status === "soldout").length;
    return { active, open, soldout };
  }, [events]);

  // TODO: brancher RPC/DB ensuite
  const updateEvent = (_id: string, _patch: any) => {};
  const deleteEvent = (id: string) => {
    if (selectedEventId === id) setSelectedEventId(null);
  };
  const addEvent = () => {
    void newTitle;
  };

  return (
    <Container>
      <AdminStats stats={stats} />

      <div className="adminEventsGrid">
        <div className="adminEventsLeft">
          <Card>
            <CardHeader title="Événements" />
            <CardBody>
              <EventTable
                events={events.map((e: any) => ({
                  id: e.id,
                  title: e.title ?? "",
                  status: e.status ?? "draft",
                  ordersCount: e.ordersCount ?? 0,
                  paidCents: e.paidCents ?? 0,
                }))}
                editingId={selectedEventId ?? undefined}
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
                event={
                  selectedEvent
                    ? {
                        id: selectedEvent.id,
                        title: selectedEvent.title ?? "",
                        status: selectedEvent.status ?? "draft",
                        ordersCount: selectedEvent.ordersCount ?? 0,
                        paidCents: selectedEvent.paidCents ?? 0,
                      }
                    : null
                }
                onUpdateEvent={(patch) => selectedEventId && updateEvent(selectedEventId, patch)}
              />
            </CardBody>
          </Card>
        </div>
      </div>
    </Container>
  );
}
