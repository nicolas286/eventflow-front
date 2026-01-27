import "../../../styles/eventTable.css";

import { Link } from "react-router-dom";

import { Badge, Button, Card, CardBody, CardHeader } from "../../../ui/components";
import { getStatusInfo } from "../../../domain/helpers/status";
import { formatDateTimeHuman } from "../../../domain/helpers/dateTime";
import type { EventOverviewRow } from "../../../domain/models/admin/admin.eventsOverview.schema";
import {
  CloseIcon,
  EditIcon,
  TrashIcon,
  EyeIcon,
} from "../../../ui/components/icon/Icons";

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
      <CardHeader title="Aperçu de mes événements" />

      <CardBody>
        {/* -------- Mobile cards -------- */}
        <div className="eventTable__mobileList">
          {events.length === 0 && (
            <div className="eventTable-empty">Aucun événement pour le moment</div>
          )}

          {events.map((row) => {
            const ev = row.event as EventOverviewRow["event"];
            const s = getStatusInfo(ev.isPublished ? "open" : "draft");
            const isSelected = ev.id === editingId;
            const canView = !!ev.slug;

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
                    <span className="eventCard__label">Date</span>
                    <span className="eventCard__value">
                      {formatDateTimeHuman(ev.startsAt)}
                    </span>
                  </div>
                  <div className="eventCard__row">
                    <span className="eventCard__label">Lieu</span>
                    <span className="eventCard__value">
                      {safeStr(ev.location)}
                    </span>
                  </div>
                </div>

                <div className="eventCard__actions">
                  {canView && (
                    <Link
                        className="eventCard__actionLink"
                        to={`/admin/events/${ev.slug}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button variant="secondary" className="eventCard__actionBtn">
                          <EyeIcon />
                        </Button>
                      </Link>


                  )}

                  <Button variant="secondary" onClick={() => onSelect(ev.id)}>
                    {isSelected ? <CloseIcon /> : <EditIcon />}
                  </Button>

                  <Button variant="danger" onClick={() => onDelete(ev.id)}>
                    <TrashIcon />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* -------- Desktop table -------- */}
        <div className="eventTable__wrap">
          <table className="eventTable__table">
            <thead>
              <tr>
                <th>Titre</th>
                <th>Statut</th>
                <th>Date</th>
                <th>Lieu</th>
                <th className="eventTable__actionsHead" />
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
                const ev = row.event as EventOverviewRow["event"];
                const s = getStatusInfo(ev.isPublished ? "open" : "draft");
                const isSelected = ev.id === editingId;
                const canView = !!ev.slug;

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
                    <td>{safeStr(ev.location)}</td>

                    <td className="eventTable__actions">
                      {canView && (
                       <Link
                          className="eventCard__actionLink"
                          to={`/admin/events/${ev.slug}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button variant="secondary" className="eventCard__actionBtn">
                            <EyeIcon />
                          </Button>
                        </Link>


                      )}

                      <Button variant="secondary" onClick={() => onSelect(ev.id)}>
                        {isSelected ? <CloseIcon /> : <EditIcon />}
                      </Button>

                      <Button
                        variant="danger"
                        onClick={() => onDelete(ev.id)}
                      >
                        <TrashIcon />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
}
