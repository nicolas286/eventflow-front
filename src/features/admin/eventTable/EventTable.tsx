import "../../../styles/eventTable.css";

import { Badge, Button, Card, CardBody, CardHeader, Input } from "../../../ui/components";
import { getStatusInfo } from "../../../domain/helpers/status";
import type { EventOverviewRow } from "../../../domain/models/admin/admin.eventsOverview.schema";

type EventTableProps = {
  events: EventOverviewRow[];
  editingId?: string;
  newTitle: string;
  setNewTitle: (v: string) => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
};

function formatEUR(cents: number) {
  return `${(cents / 100).toFixed(2)} €`;
}

export default function EventTable({
  events,
  editingId,
  onSelect,
  onDelete,
  newTitle,
  setNewTitle,
  onAdd,
}: EventTableProps) {
  return (
    <Card>
      <CardHeader
        title="Événements"
        right={
          <>
            <Input
              placeholder="Nouvel événement"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <Button label="Ajouter" onClick={onAdd} />
          </>
        }
      />

      <CardBody>
        <table className="eventTable">
          <thead>
            <tr>
              <th>Titre</th>
              <th>Statut</th>
              <th>Commandes</th>
              <th>Total encaissé</th>
              <th />
            </tr>
          </thead>

          <tbody>
            {events.length === 0 && (
              <tr>
                <td colSpan={5} className="eventTable-empty">
                  Aucun événement pour le moment
                </td>
              </tr>
            )}

            {events.map((row) => {
              const ev = row.event;
              const statusKey = ev.isPublished ? "open" : "draft";
              const s = getStatusInfo(statusKey);
              const isEditing = ev.id === editingId;

              return (
                <tr
                  key={ev.id}
                  className={isEditing ? "eventTable-row--active" : undefined}
                >
                  <td className="eventTable-title">{ev.title}</td>

                  <td>
                    <Badge tone={s.tone} label={s.label} />
                  </td>

                  <td>{row.ordersCount}</td>

                  <td>{formatEUR(row.paidCents)}</td>

                  <td className="eventTable-actions">
                    <Button
                      label={isEditing ? "En cours" : "Éditer"}
                      disabled={isEditing}
                      onClick={() => onSelect(ev.id)}
                    />
                    <Button
                      variant="danger"
                      label="Suppr."
                      onClick={() => onDelete(ev.id)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardBody>
    </Card>
  );
}
