import "../../../styles/eventTable.css";

import { Badge, Button, Card, CardBody, CardHeader } from "../../../ui/components";
import { getStatusInfo } from "../../../domain/helpers/status";
import { formatDateTimeHuman } from "../../../domain/helpers/dateTime";
import type { EventOverviewRow } from "../../../domain/models/admin/admin.eventsOverview.schema";

type EventTableProps = {
  events: EventOverviewRow[];
  editingId?: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
};

function safeStr(v: unknown) {
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
}

export default function EventTable({
  events,
  editingId,
  onSelect,
  onDelete,
}: EventTableProps) {
  return (
    <Card>
      <CardHeader title="Événements" />

      <CardBody>
        <div className="eventTable__mobileList">
          {events.length === 0 && (
            <div className="eventTable-empty">Aucun événement pour le moment</div>
          )}

          {events.map((row) => {
            const ev = row.event as any;
            const s = getStatusInfo(ev.isPublished ? "open" : "draft");
            const isSelected = ev.id === editingId;

            return (
              <div
                key={ev.id}
                className={`eventCard ${isSelected ? "isSelected" : ""}`}
              >
                <div className="eventCard__top">
                  <div className="eventCard__title">{safeStr(ev.title)}</div>
                  <Badge tone={s.tone} label={s.label} />
                </div>

                <div className="eventCard__meta">
                  <div className="eventCard__row">
                    <span className="eventCard__label">Début</span>
                    <span className="eventCard__value">
                      {formatDateTimeHuman(ev.startsAt)}
                    </span>
                  </div>
                  <div className="eventCard__row">
                    <span className="eventCard__label">Fin</span>
                    <span className="eventCard__value">
                      {formatDateTimeHuman(ev.endsAt)}
                    </span>
                  </div>
                  <div className="eventCard__row">
                    <span className="eventCard__label">Lieu</span>
                    <span className="eventCard__value">{safeStr(ev.location)}</span>
                  </div>
                </div>

                <div className="eventCard__actions">
                  <Button
                    label={isSelected ? "Fermer" : "Éditer"}
                    onClick={() => onSelect(ev.id)}
                  />
                  <Button
                    variant="danger"
                    label="Suppr."
                    onClick={() => onDelete(ev.id)}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="eventTable__wrap">
          <table className="eventTable__table">
            <thead>
              <tr>
                <th>Titre</th>
                <th>Statut</th>
                <th>Début</th>
                <th>Fin</th>
                <th>Lieu</th>
                <th className="eventTable__actionsHead" />
              </tr>
            </thead>

            <tbody>
              {events.length === 0 && (
                <tr>
                  <td colSpan={6} className="eventTable-empty">
                    Aucun événement pour le moment
                  </td>
                </tr>
              )}

              {events.map((row) => {
                const ev = row.event as any;
                const s = getStatusInfo(ev.isPublished ? "open" : "draft");
                const isSelected = ev.id === editingId;

                return (
                  <tr
                    key={ev.id}
                    className={isSelected ? "isSelected" : undefined}
                  >
                    <td className="title">{safeStr(ev.title)}</td>
                    <td>
                      <Badge tone={s.tone} label={s.label} />
                    </td>
                    <td>{formatDateTimeHuman(ev.startsAt)}</td>
                    <td>{formatDateTimeHuman(ev.endsAt)}</td>
                    <td>{safeStr(ev.location)}</td>

                    <td className="eventTable__actions">
                      <Button
                        label={isSelected ? "Fermer" : "Éditer"}
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
        </div>

        <div className="eventTable__hint">
          Utilise “Éditer” pour ouvrir ou fermer le panneau d’édition.
        </div>
      </CardBody>
    </Card>
  );
}
