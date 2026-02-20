import "../../../styles/desktop/eventTable.desktop.css";
import "../../../styles/mobile/eventTable.mobile.css";
import { Link } from "react-router-dom";

import { Badge, Button, Card, CardBody, CardHeader } from "../../../ui/components";
import { getStatusInfo } from "../../../domain/helpers/status";
import { formatDateTimeHuman } from "../../../domain/helpers/dateTime";
import type { EventOverviewRow } from "../../../domain/models/admin/admin.eventsOverview.schema";
import { CloseIcon, EditIcon, TrashIcon, EyeIcon, CopyIcon } from "../../../ui/components/icon/Icons";

type EventTableProps = {
  events: EventOverviewRow[];
  editingId?: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  orgSlug?: string;

  renderInlineEditor?: (row: EventOverviewRow) => React.ReactNode;
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
  renderInlineEditor,
  orgSlug,
}: EventTableProps) {

  async function copyPublicEventUrl(orgSlug?: string, eventSlug?: string) {
  const path = `/o/${orgSlug}/e/${eventSlug}`;
  const fullUrl = `${window.location.origin}${path}`;

  try {
    await navigator.clipboard.writeText(fullUrl);
    console.log("Lien public copié :", fullUrl);
  } catch (err) {
    console.error("Erreur copie presse-papier", err);
  }
}

  return (
    <Card>
      <CardHeader title="Aperçu de mes événements" />

      <CardBody>
        <div className="eventTable__list">
          {events.length === 0 && (
            <div className="eventTable-empty">Aucun événement pour le moment</div>
          )}

          {events.map((row) => {
            const ev = row.event as EventOverviewRow["event"];
            const s = getStatusInfo(ev.isPublished ? "open" : "draft");
            const isSelected = ev.id === editingId;
            const canView = !!ev.slug;

            return (
              <div key={ev.id} className="eventCardWrap">
                <div className={`eventCard ${isSelected ? "isSelected" : ""}`}>
                  <div className="eventCard__top">
                    <div className="eventCard__title">{safeStr(ev.title)}</div>
                    <Badge tone={s.tone} label={s.label} />
                  </div>

                  <div className="eventCard__meta">
                    <div className="eventCard__row">
                      <span className="eventCard__label">Date</span>
                      <span className="eventCard__value">{formatDateTimeHuman(ev.startsAt)}</span>
                    </div>
                    <div className="eventCard__row">
                      <span className="eventCard__label">Lieu</span>
                      <span className="eventCard__value">{safeStr(ev.location)}</span>
                    </div>
                  </div>

                  <div className="eventCard__actions">
                    {canView && (
                      <Button
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyPublicEventUrl(orgSlug, ev.slug!);
                        }}
                        title="Copier le lien public"
                      >
                        <CopyIcon/>
                      </Button>
                    )}

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

                {renderInlineEditor?.(row)}
              </div>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}
