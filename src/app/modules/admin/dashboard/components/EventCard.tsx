import { Link } from "react-router-dom";
import { Badge } from "@ui/components";
import EventCardActionsMenu from "./EventCardActionsMenu";
import { getStatusInfo } from "@helpers/status";
import { formatDateTimeHuman } from "@helpers/dateTime";
import { safeEventTitle, toDisplayText } from "@shared/helpers/normalize";

import type { EventOverviewRow } from "../../events/schemas/admin.eventsOverview.schema";
import { CoinsIcon, QrIcon, UsersIcon } from "@shared/ui/components/icon/Icons";
import { useNavigate } from "react-router-dom";
import Button from "@ui/components/button/Button";
import { formatMoney } from "@app/modules/public/register/helpers/checkoutStore";
import { isPastEvent } from "@shared/helpers/isPastEvent";

import "./EventCard.css";


type Props = {
  row: EventOverviewRow;
  isSelected: boolean;
  orgSlug?: string;

  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (row: EventOverviewRow) => void | Promise<void>;

  onCopyLink: (orgSlug: string | undefined, eventSlug: string) => void | Promise<void>;
  onShareFacebook: (orgSlug: string | undefined, eventSlug: string) => void;
  onShareWhatsapp: (orgSlug: string | undefined, eventSlug: string) => void;
};

export default function EventCard({
  row,
  isSelected,
  orgSlug,
  onSelect,
  onDelete,
  onDuplicate,
  onCopyLink,
  onShareFacebook,
  onShareWhatsapp,
}: Props) {
  const { event: ev, ordersCount, paidCents } = row;
  const s = getStatusInfo(ev.isPublished ? "open" : "draft");
  const isPast = isPastEvent(ev); 
  const canView = !!ev.slug;
  const detailsTo = canView ? `/admin/events/${ev.slug}` : undefined;
  const navigate = useNavigate();

  const qrScannerTo = canView
  ? `/admin/events/${ev.slug}?${new URLSearchParams({
      tab: "participants",
      participantsTab: "tickets",
      openScanner: "1",
    }).toString()}`
  : undefined;

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

         <div className="eventCard__badges">
          <Badge
            tone={isPast ? "neutral" : s.tone}
            label={isPast ? "Passé" : s.label}
          />
        </div>
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

      <div className="eventCard__stats">
        <span className="eventCard__stat">
         <UsersIcon/> {ordersCount} commande{ordersCount > 1 ? "s" : ""}
        </span>

        {paidCents > 0 && (
          <span className="eventCard__stat">
          <CoinsIcon/> {formatMoney(paidCents, "€")}
          </span>
        )}
      </div>

      <div className="eventCard__actions">
        {qrScannerTo && (
         <Button
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`${qrScannerTo}`);
            }}
            title="Ouvrir le scanner QR pour cet événement"
          >
            <QrIcon/>
          </Button>
        
        )}

        <EventCardActionsMenu
        canView={canView}
        detailsTo={detailsTo}
        isSelected={isSelected}
        onToggleInlineEdit={() => onSelect(ev.id)}
        onDuplicate={() => onDuplicate(row)}
        onCopyLink={canView ? () => onCopyLink(orgSlug, ev.slug!) : undefined}
        onShareFacebook={canView ? () => onShareFacebook(orgSlug, ev.slug!) : undefined}
        onShareWhatsapp={canView ? () => onShareWhatsapp(orgSlug, ev.slug!) : undefined}
        onDelete={() => onDelete(ev.id)}
      />
      </div>
    </div>
  );
}