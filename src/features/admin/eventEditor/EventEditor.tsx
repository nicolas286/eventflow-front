import "../../../styles/eventEditor.css";

import { Badge, Card, CardBody, CardHeader, Input } from "../../../ui/components";
import { getStatusInfo } from "../../../domain/helpers/status";
import type { EventOverviewRow } from "../../../domain/models/eventOverviewRow.schema";

type EventEditorProps = {
  event: EventOverviewRow | null;
  onUpdateEvent: (
    patch: Partial<Pick<EventOverviewRow["event"], "title" | "isPublished">>
  ) => void;
};

function formatEUR(cents: number) {
  return `${(cents / 100).toFixed(2)} €`;
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

  const ev = event.event;
  const derivedStatus = ev.isPublished ? "open" : "draft";
  const status = getStatusInfo(derivedStatus);

  return (
    <Card>
      <CardHeader
        title="Éditeur d’événement"
        subtitle={`ID: ${ev.id}`}
        right={<Badge tone={status.tone} label={status.label} />}
      />

      <CardBody>
        <div className="eventEditor">
          <div className="eventEditor__grid">
            <Input
              label="Titre"
              value={ev.title}
              onChange={(e) => onUpdateEvent({ title: e.target.value })}
            />

            <div>
              <div className="eventEditor__label">Publication</div>
              <select
                className="eventEditor__select"
                value={ev.isPublished ? "published" : "draft"}
                onChange={(e) =>
                  onUpdateEvent({ isPublished: e.target.value === "published" })
                }
              >
                <option value="draft">Brouillon</option>
                <option value="published">Publié</option>
              </select>
            </div>

            <div className="eventEditor__stat">
              <div className="eventEditor__label">Commandes</div>
              <div className="eventEditor__value">{event.ordersCount}</div>
            </div>

            <div className="eventEditor__stat">
              <div className="eventEditor__label">Total encaissé</div>
              <div className="eventEditor__value">{formatEUR(event.paidCents)}</div>
            </div>

            <div className="eventEditor__stat">
              <div className="eventEditor__label">Début</div>
              <div className="eventEditor__value">{ev.startsAt}</div>
            </div>

            <div className="eventEditor__stat">
              <div className="eventEditor__label">Fin</div>
              <div className="eventEditor__value">{ev.endsAt}</div>
            </div>
          </div>

          <div className="eventEditor__hint">
            Les infos détaillées (slug, description, billets, etc.)
            viendront avec une RPC <code>get_event_detail</code>.
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
