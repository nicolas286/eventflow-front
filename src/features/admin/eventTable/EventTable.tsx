import "../../../styles/eventTable.css";

import { Badge, Button, Card, CardBody, CardHeader, Input } from "../../../ui/components";
import { getStatusInfo } from "../../../domain/helpers/status";

export type EventRow = {
  id: string;
  title: string;
  status: string;
  ordersCount: number;
  paidCents: number;
};

type EventTableProps = {
  events: EventRow[];
  editingId?: string;
  newTitle: string;
  setNewTitle: (v: string) => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
};

export default function EventTable({
  events,
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

            {events.map((ev) => {
              const s = getStatusInfo(ev.status ?? "draft");

              return (
                <tr key={ev.id}>
                  <td className="eventTable-title">{ev.title}</td>

                  <td>
                    <Badge tone={s.tone} label={s.label} />
                  </td>

                  <td>{ev.ordersCount}</td>

                  <td>
                    {(ev.paidCents / 100).toFixed(2)} €
                  </td>

                  <td className="eventTable-actions">
                    <Button
                      label="Éditer"
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