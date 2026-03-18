import type { PublicEventOverview } from "@app/modules/public/organization/schemas/public.orgEventsOverview.schema";
import { Button } from "@shared/ui/components";
import "./WidgetEventCard.css"; 

type Props = {
    event: PublicEventOverview;
    onClick: () => void;
}

export function WidgetEventCard({event, onClick}: Props) {
    return (
        <div
        className="widgetEventCard"
        onClick={onClick}
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

            {event.isSoldOut ? (
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 6 }}>
                Complet
              </div>
            ) : null}

            <Button
              className="widgetButton"
              label={event.isSoldOut ? "Complet" : "Billets"}
              disabled={event.isSoldOut}
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
            />

        </div>
    );
}