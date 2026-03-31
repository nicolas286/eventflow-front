import type { PublicEventOverview } from "@app/modules/public/organization/schemas/public.orgEventsOverview.schema";
import { Button } from "@shared/ui/components";
import "./WidgetEventCard.css"; 

type Props = {
  event: PublicEventOverview;
  onClick: () => void;
}

export function WidgetEventCard({ event, onClick }: Props) {
  const isSoldOut = event.isSoldOut;
  const isClosed = event.isRegistrationOpen === false;
  const isDisabled = isSoldOut || isClosed;

  const label = isSoldOut
    ? "Complet"
    : isClosed
      ? "Clôturé"
      : "Billets";

  return (
    <div
      className={`widgetEventCard ${isDisabled ? "isDisabled" : ""}`}
      onClick={() => {
        if (!isDisabled) onClick();
      }}
    >
      <div className="widgetEventTitle">{event.title}</div>

      {event.startsAt && (
        <div className="widgetEventDate">
          {new Date(event.startsAt).toLocaleString("fr-BE", {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </div>
      )}

      {isSoldOut ? (
        <div style={{ fontSize: 13, fontWeight: 600, marginTop: 6 }}>
          Complet
        </div>
      ) : isClosed ? (
        <div style={{ fontSize: 13, fontWeight: 600, marginTop: 6 }}>
          Inscriptions clôturées
        </div>
      ) : null}

      <Button
        className="widgetButton"
        label={label}
        disabled={isDisabled}
        onClick={(e) => {
          e.stopPropagation();
          if (!isDisabled) onClick();
        }}
      />
    </div>
  );
}