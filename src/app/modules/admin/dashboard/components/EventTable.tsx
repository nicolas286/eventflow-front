import "./EventTable.mobile.css";
import "./EventTable.desktop.css";

import { Card, CardBody, CardHeader } from "@ui/components";
import { useToast } from "@ui/components/toast/useToast";
import { normalizeWebsite } from "@shared/helpers/normalize";

import EventCard from "./EventCard";

import type { EventOverviewRow } from "../../events/schemas/admin.eventsOverview.schema";

type EventTableProps = {
  events: EventOverviewRow[];
  editingId?: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  orgSlug?: string;

  renderInlineEditor?: (row: EventOverviewRow) => React.ReactNode;
};

export default function EventTable({
  events,
  editingId,
  onSelect,
  onDelete,
  renderInlineEditor,
  orgSlug,
}: EventTableProps) {

  const { showToast } = useToast();

  function getShareEventUrl(orgSlug?: string, eventSlug?: string) {
    const baseUrl = normalizeWebsite(
      import.meta.env.VITE_PUBLIC_BASE_URL || "https://eventflow-staging.netlify.app"
    );

    if (!orgSlug || !eventSlug) return null;

    return `${baseUrl}/share/o/${encodeURIComponent(orgSlug)}/e/${encodeURIComponent(eventSlug)}`;
  }

  async function copyPublicEventUrl(orgSlug?: string, eventSlug?: string) {
    const fullUrl = getShareEventUrl(orgSlug, eventSlug);

    if (!fullUrl) {
      showToast({
        title: "Impossible de copier",
        description: "Lien public indisponible.",
        variant: "error",
      });
      return;
    }

    await navigator.clipboard.writeText(fullUrl);

    showToast({
      title: "Copié",
      description: "Lien de partage copié.",
      variant: "success",
    });
  }

  function shareOnFacebook(orgSlug?: string, eventSlug?: string) {
    const shareUrl = getShareEventUrl(orgSlug, eventSlug);

    if (!shareUrl) {
      showToast({
        title: "Impossible de partager",
        description: "Lien indisponible.",
        variant: "error",
      });
      return;
    }

    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;

    window.open(fbUrl, "_blank", "noopener,noreferrer");
  }

  function shareOnWhatsapp(orgSlug?: string, eventSlug?: string) {
  const shareUrl = getShareEventUrl(orgSlug, eventSlug);

  if (!shareUrl) {
    showToast({
      title: "Impossible de partager",
      description: "Lien indisponible.",
      variant: "error",
    });
    return;
  }

  const message = `Découvrez cet événement : ${shareUrl}`;
  const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

  window.open(waUrl, "_blank", "noopener,noreferrer");
}

  return (
    <Card>

      <CardHeader title="Aperçu de mes événements" />

      <CardBody>

        <div className="eventTable__list">

          {events.length === 0 && (
            <div className="eventTable-empty">
              Aucun événement pour le moment
            </div>
          )}

          {events.map((row) => {

            return (
              <div key={row.event.id} className="eventCardWrap">

                <EventCard
                  row={row}
                  isSelected={row.event.id === editingId}
                  orgSlug={orgSlug}
                  onSelect={onSelect}
                  onDelete={onDelete}
                  onCopyLink={copyPublicEventUrl}
                  onShareFacebook={shareOnFacebook}
                  onShareWhatsapp={shareOnWhatsapp}
                />

                {renderInlineEditor?.(row)}

              </div>
            );
          })}

        </div>

      </CardBody>

    </Card>
  );
}