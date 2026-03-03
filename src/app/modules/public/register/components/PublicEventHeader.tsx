import { Link } from "react-router-dom";
import Button from "@ui/components/button/Button";
import { formatDateTimeHuman } from "@helpers/dateTime";

import "@layouts/publicPages.desktop.css";
import type { PublicEvent, 
  PublicOrgProfileOverviewForEventPage } from "../../events/schemas/public.eventDetailBySlug.schema";

type Props = {
  orgSlug: string;
  org?: PublicOrgProfileOverviewForEventPage;
  event: PublicEvent;
};

export function PublicEventHeader({ orgSlug, org, event }: Props) {
  const startText = event.startsAt ? formatDateTimeHuman(event.startsAt) : null;
  const endText = event.endsAt ? formatDateTimeHuman(event.endsAt) : null;

  const banner = event.bannerUrl;

  return (
    <>
      {banner ? (
        <>
          <div
            className="publicBannerWrap"
            style={{ ["--banner-url" as string]: `url("${banner}")` }}
          >
            <div className="publicBannerClip">
              <div className="publicBanner" aria-label={event.title} />
            </div>

            {org?.logoUrl ? (
              <img src={org.logoUrl} alt={org.slug} className="publicBannerLogo" />
            ) : null}
          </div>

          <div className="publicBannerUnderSpace" />
        </>
      ) : null}

      <div className="publicHeaderRow">
        <div className="publicTitleBlock">
          <h1 className="publicTitle">{event.title}</h1>
          <div className="publicSubtitle">
            {event.location ?? "Lieu à venir"}
          </div>
        </div>

        {(startText || endText) ? (
          <div className="publicDateChip">
            {startText ? <span>Début : {startText}</span> : null}
            {endText ? <span>Fin : {endText}</span> : null}
          </div>
        ) : null}

        <div className="publicActions">
          <Link to={`/o/${orgSlug}`}>
            <Button variant="primary" label="Retour" />
          </Link>
        </div>
      </div>
    </>
  );
}
