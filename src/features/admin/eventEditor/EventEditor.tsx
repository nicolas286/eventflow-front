import "../../../styles/eventEditor.css";

import { Badge, Card, CardBody, CardHeader, Input } from "../../../ui/components";
import { getStatusInfo, statusOptions } from "../../../domain/helpers/status";

export type EventOverview = {
  id: string;
  title: string;
  status: string;      // si ton subset ne l’a pas toujours, passe "draft" côté mapping
  ordersCount: number;
  paidCents: number;
};

type EventEditorProps = {
  event: EventOverview | null;
  onUpdateEvent: (patch: Partial<Pick<EventOverview, "title" | "status">>) => void;
};

function formatEUR(cents: number) {
  const n = Number(cents ?? 0);
  return `${(n / 100).toFixed(2)} €`;
}

export default function EventEditor({ event, onUpdateEvent }: EventEditorProps) {
  if (!event) {
    return (
      <Card>
        <CardHeader title="Éditeur d’événement" subtitle="Sélectionne un événement" />
        <CardBody>
          <div className="eventEditor__empty">Aucun événement sélectionné.</div>
        </CardBody>
      </Card>
    );
  }

  const status = getStatusInfo(event.status ?? "draft");

  return (
    <Card>
      <CardHeader
        title="Éditeur d’événement"
        subtitle={`ID: ${event.id}`}
        right={<Badge tone={status.tone} label={status.label} />}
      />

      <CardBody>
        <div className="eventEditor">
          <div className="eventEditor__grid">
            <Input
              label="Titre"
              value={event.title}
              onChange={(e) => onUpdateEvent({ title: e.target.value })}
            />

            <div>
              <div className="eventEditor__label">Statut</div>
              <select
                className="eventEditor__select"
                value={event.status}
                onChange={(e) => onUpdateEvent({ status: e.target.value })}
              >
                {statusOptions.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Stats (overview) */}
            <div className="eventEditor__stat">
              <div className="eventEditor__label">Commandes</div>
              <div className="eventEditor__value">{event.ordersCount}</div>
            </div>

            <div className="eventEditor__stat">
              <div className="eventEditor__label">Total encaissé</div>
              <div className="eventEditor__value">{formatEUR(event.paidCents)}</div>
            </div>
          </div>

          {/* Hint cohérent : explique pourquoi pas plus */}
          <div className="eventEditor__hint">
            Infos détaillées (description, billets, etc.) pas encore chargées dans l’overview.
            On branchera une RPC “get_event_detail” pour ça.
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
