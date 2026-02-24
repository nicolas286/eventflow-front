import "../../../styles/desktop/eventTable.desktop.css";
import "../../../styles/mobile/eventTable.mobile.css";
import { Link } from "react-router-dom";

import { Badge, Button, Card, CardBody, CardHeader } from "../../../ui/components";
import { useToast } from "../../../ui/components/toast/useToast";
import { getStatusInfo } from "../../../domain/helpers/status";
import { formatDateTimeHuman } from "../../../domain/helpers/dateTime";
import type { EventOverviewRow } from "../../../domain/models/admin/admin.eventsOverview.schema";
import { CloseIcon, EditIcon, TrashIcon, CopyIcon, NotepadIcon, FacebookIcon} from "../../../ui/components/icon/Icons";

type EventTableProps = {
  events: EventOverviewRow[];
  editingId?: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  orgSlug?: string;

  renderInlineEditor?: (row: EventOverviewRow) => React.ReactNode;
};

export function safeStr(v: unknown) {
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
}

function trimSlashEnd(s: string) {
  return String(s).replace(/\/+$/, "");
}


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
    const baseUrl = trimSlashEnd(
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
        description: "Lien public indisponible (slug manquant).",
        variant: "error",
        duration: 5000,
      });
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(fullUrl);
      } else {
        const ta = document.createElement("textarea");
        ta.value = fullUrl;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        if (!ok) throw new Error("COPY_FAILED");
      }

      showToast({
        title: "Copié",
        description: "Lien de partage de l’événement copié.",
        variant: "success",
        duration: 3500,
      });
    } catch (err) {
      console.error("Erreur copie presse-papier", err);
      showToast({
        title: "Impossible de copier",
        description: "Votre navigateur a bloqué l’accès au presse-papier.",
        variant: "error",
        duration: 6000,
      });
    }
  }

  function shareOnFacebook(orgSlug?: string, eventSlug?: string) {
    const shareUrl = getShareEventUrl(orgSlug, eventSlug);

    if (!shareUrl) {
      showToast({
        title: "Impossible de partager",
        description: "Lien de partage indisponible (slug manquant).",
        variant: "error",
        duration: 5000,
      });
      return;
    }

    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(fbUrl, "_blank", "noopener,noreferrer");

    // (optionnel) feedback léger
    showToast({
      title: "Partage Facebook",
      description: "La fenêtre de partage s’est ouverte.",
      variant: "success",
      duration: 2500,
    });
  }

  return (
    <Card>
      <CardHeader title="Aperçu de mes événements" />

      <CardBody>
        <div className="eventTable__list">
          {events.length === 0 && <div className="eventTable-empty">Aucun événement pour le moment</div>}

          {events.map((row) => {
            const ev = row.event as EventOverviewRow["event"];
            const s = getStatusInfo(ev.isPublished ? "open" : "draft");
            const isSelected = ev.id === editingId;
            const canView = !!ev.slug;

            return (
              <div key={ev.id} className="eventCardWrap">
                <div className={`eventCard ${isSelected ? "isSelected" : ""}`}>
                  <div className="eventCard__top">
                    <Link
                      className="eventCard__actionLink"
                      to={`/admin/events/${ev.slug}`}
                      onClick={(e) => e.stopPropagation()}
                      title="Voir et modifier les détails de l'événement"
                    >
                      <div className="eventCard__title">{safeStr(ev.title)}</div>
                    </Link>
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

                    {/* ✅ 1 — Voir / Détails (tout à gauche maintenant) */}
                    {canView && (
                      <Link
                        className="eventCard__actionLink"
                        to={`/admin/events/${ev.slug}`}
                        onClick={(e) => e.stopPropagation()}
                        title="Voir et modifier les détails de l'événement"
                      >
                        <Button variant="secondary" className="eventCard__actionBtn">
                          <NotepadIcon />
                        </Button>
                      </Link>
                    )}

                    {/* ✅ 2 — Partage Facebook */}
                    {canView && (
                      <Button
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          shareOnFacebook(orgSlug, ev.slug!);
                        }}
                        title="Partager sur Facebook"
                      >
                        <FacebookIcon />
                      </Button>
                    )}

                    {/* ✅ 3 — Copier le lien */}
                    {canView && (
                      <Button
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          void copyPublicEventUrl(orgSlug, ev.slug!);
                        }}
                        title="Copier le lien de partage"
                      >
                        <CopyIcon />
                      </Button>
                    )}

                    {/* ✅ 4 — Modification rapide */}
                    <Button
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(ev.id);
                      }}
                      title="Modification rapide de l'événement"
                    >
                      {isSelected ? <CloseIcon /> : <EditIcon />}
                    </Button>

                    {/* ✅ 5 — Supprimer */}
                    <Button
                      variant="danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(ev.id);
                      }}
                      title="Supprimer l'événement"
                    >
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