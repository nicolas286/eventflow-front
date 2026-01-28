import { Link } from "react-router-dom";
import Button from "../../../ui/components/button/Button";
import { formatDateTimeHuman } from "../../../domain/helpers/dateTime";

import "../../../styles/publicPages.css";

type Props = {
  orgSlug: string;
  org?: { slug: string; logoUrl: string; defaultEventBannerUrl: string };
  event: {
    title: string;
    location: string | null;
    bannerUrl: string;
    startsAt: string | null;
    endsAt: string | null;
  };
};

export function PublicEventHeader({ orgSlug, org, event }: Props) {
  const startText = event.startsAt ? formatDateTimeHuman(event.startsAt) : null;
  const endText = event.endsAt ? formatDateTimeHuman(event.endsAt) : null;

  const banner = event.bannerUrl || org?.defaultEventBannerUrl;

  return (
    <>
      {banner ? (
        <>
          <div className="publicBannerWrap">
            <img src={banner} alt={event.title} className="publicBanner" />
            {org?.logoUrl ? (
              <img
                src={org.logoUrl}
                alt={org.slug}
                className="publicBannerLogo"
              />
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
            <Button variant="secondary" label="Retour" />
          </Link>
        </div>
      </div>
    </>
  );
}
