import "../../../styles/eventTable.css";

import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
} from "../../../ui/components";
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
          <div className="eventTable__headerRight">
            <Input
              className="eventTable__newInput"
              placeholder="Nouvel événement"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <Button label="Ajouter" onClick={onAdd} />
          </div>
        }
      />

      <CardBody>
        <div className="eventTable__wrap">
          <table className="eventTable__table">
            <thead>
              <tr>
                <th>Titre</th>
                <th>Statut</th>
                <th>Commandes</th>
                <th>Total encaissé</th>
                <th className="eventTable__actionsHead" />
              </tr>
            </thead>

            <tbody>
              {events.map((row) => {
                const ev = row.event;
                const s = getStatusInfo(ev.isPublished ? "open" : "draft");
                const isSelected = ev.id === editingId;

                return (
                  <tr
                    key={ev.id}
                    className={isSelected ? "isSelected" : undefined}
                    onClick={() => onSelect(ev.id)}
                  >
                    <td className="title">{ev.title}</td>
                    <td>
                      <Badge tone={s.tone} label={s.label} />
                    </td>
                    <td>{row.ordersCount}</td>
                    <td>{formatEUR(row.paidCents)}</td>

                    <td className="eventTable__actions">
                      <Button
                        variant="danger"
                        label="Suppr."
                        onClick={() => onDelete(ev.id)}
                      />
                      <Button
                        variant="ghost"
                        className={`eventRowToggle ${isSelected ? "isActive" : ""}`}
                        onClick={() => onSelect(ev.id)}
                      >
                        {isSelected ? "×" : ">"}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="eventTable__hint">
          Clique sur un événement pour ouvrir ou fermer l’éditeur.
        </div>
      </CardBody>
    </Card>
  );
}
