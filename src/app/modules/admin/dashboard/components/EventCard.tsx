import { Link } from "react-router-dom";
import { Badge } from "@ui/components";
import EventCardActionsMenu from "./EventCardActionsMenu";
import { getStatusInfo } from "@helpers/status";
import { formatDateTimeHuman } from "@helpers/dateTime";
import { safeEventTitle, toDisplayText } from "@shared/helpers/normalize";


import type { EventOverviewRow } from "../../events/schemas/admin.eventsOverview.schema";

type Props = {
  ev: EventOverviewRow["event"];
  isSelected: boolean;
  orgSlug?: string;

  onSelect: (id: string) => void;
  onDelete: (id: string) => void;

  onCopyLink: (orgSlug: string | undefined, eventSlug: string) => void | Promise<void>;
  onShareFacebook: (orgSlug: string | undefined, eventSlug: string) => void;
  onShareWhatsapp: (orgSlug: string | undefined, eventSlug: string) => void;
};

export default function EventCard({
  ev,
  isSelected,
  orgSlug,
  onSelect,
  onDelete,
  onCopyLink,
  onShareFacebook,
  onShareWhatsapp,
}: Props) {
  const s = getStatusInfo(ev.isPublished ? "open" : "draft");
  const canView = !!ev.slug;
  const detailsTo = canView ? `/admin/events/${ev.slug}` : undefined;

  return (
    <div className={`eventCard ${isSelected ? "isSelected" : ""}`}>
      <div className="eventCard__top">
        {canView ? (
          <Link
            className="eventCard__actionLink"
            to={`/admin/events/${ev.slug}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="eventCard__title">{safeEventTitle({ event: ev })}</div>
          </Link>
        ) : (
          <div className="eventCard__title">{safeEventTitle({ event: ev })}</div>
        )}

        <Badge tone={s.tone} label={s.label} />
      </div>

      <div className="eventCard__meta">
        <div className="eventCard__row">
          <span className="eventCard__label">Date</span>
          <span className="eventCard__value">{formatDateTimeHuman(ev.startsAt)}</span>
        </div>

        <div className="eventCard__row">
          <span className="eventCard__label">Lieu</span>
          <span className="eventCard__value">{toDisplayText(ev.location)}</span>
        </div>
      </div>

      <div className="eventCard__actions">
        <EventCardActionsMenu
            canView={canView}
            detailsTo={detailsTo}
            isSelected={isSelected}
            onToggleInlineEdit={() => onSelect(ev.id)}
            onCopyLink={canView ? () => onCopyLink(orgSlug, ev.slug!) : undefined}
            onShareFacebook={canView ? () => onShareFacebook(orgSlug, ev.slug!) : undefined}
            onShareWhatsapp={canView ? () => onShareWhatsapp(orgSlug, ev.slug!) : undefined}
            onDelete={() => onDelete(ev.id)}
        />
       </div>
    </div>
  );
}