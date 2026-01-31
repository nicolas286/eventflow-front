import { useParams, Link } from "react-router-dom";
import { supabase } from "../../gateways/supabase/supabaseClient";
import { usePublicOrgData } from "../../features/admin/hooks/usePublicOrgData";

import Container from "../../ui/components/container/Container";
import Card, { CardBody } from "../../ui/components/card/Card";
import Button from "../../ui/components/button/Button";
import Badge from "../../ui/components/badge/Badge";

import { formatDateTimeHuman } from "../../domain/helpers/dateTime";

import "../../styles/publicPages.css";
import type { PublicEventOverview } from "../../domain/models/public/public.orgEventsOverview.schema";

export function OrgPublicPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();

  const { loading, error, org, profile, events } = usePublicOrgData({
    supabase,
    orgSlug,
  });

  if (loading) {
    return (
      <div className="publicPage publicOrgPage">
        <Container>Chargement…</Container>
      </div>
    );
  }

  if (error) {
    return (
      <div className="publicPage publicOrgPage">
        <Container>Erreur : {error}</Container>
      </div>
    );
  }

  if (!org || !profile) {
    return (
      <div className="publicPage publicOrgPage">
        <Container>Organisation introuvable.</Container>
      </div>
    );
  }

  const displayName = profile.displayName ?? org.name;

  return (
    <div className="publicPage publicOrgPage">
      <Container>
        <div className="publicSurface">
          {/* HERO */}
          <div className="publicHero">
            <div className="publicBrand">
              {profile.logoUrl ? (
                <img src={profile.logoUrl} alt={displayName} className="publicLogo" />
              ) : null}

              <div className="publicOrgHeroRight">
                <div className="publicTitleBlock">
                  <h1 className="publicTitle">{displayName}</h1>
                  <div className="publicSubtitle">
                    {profile.slug} · {org.type}
                  </div>
                </div>

                <div className="publicActions">
                  {profile.website ? (
                    <a href={profile.website} target="_blank" rel="noreferrer">
                      <Button variant="secondary" label="Site web" />
                    </a>
                  ) : null}

                  {profile.publicEmail ? (
                    <a href={`mailto:${profile.publicEmail}`}>
                      <Button variant="ghost" label="Contact" />
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="publicDivider" />

          {profile.description ? (
            <div className="publicProse" style={{ whiteSpace: "pre-wrap" }}>
              {profile.description}
            </div>
          ) : (
            <div className="publicEmpty">Cette organisation n’a pas encore de description.</div>
          )}
        </div>

        <div className="publicSectionTitle">Événements</div>

        {events.length === 0 ? (
          <div className="publicEmpty">Aucun événement publié.</div>
        ) : (
          <div className="publicOrgEventsGrid">
            {events.map((e: PublicEventOverview) => {
              const banner = e.bannerUrl;

              const startText = e.startsAt ? formatDateTimeHuman(e.startsAt) : null;
              const endText = e.endsAt ? formatDateTimeHuman(e.endsAt) : null;

              return (
                <Card key={e.id} className="publicOrgEventCard">
                  {banner ? (
                    <div
                      className="publicOrgEventBanner"
                      style={{ backgroundImage: `url("${banner}")` }}
                      aria-label={e.title}
                    />
                  ) : null}

                  <CardBody className="publicOrgEventBody">
                    <div className="publicOrgEventHeaderRow">
                      <div className="publicOrgEventTitle">{e.title}</div>
                      {e.startsAt ? <Badge tone="info" label="À venir" /> : null}
                    </div>

                    <div className="publicOrgEventLocation">
                      {e.location ?? "Lieu à venir"}
                    </div>

                    {(startText || endText) ? (
                      <div className="publicOrgEventDates">
                        {startText ? <span>Début : {startText}</span> : null}
                        {endText ? <span>Fin : {endText}</span> : null}
                      </div>
                    ) : null}

                    <div className="publicOrgEventFooter">
                      <Link to={`e/${e.slug}`}>
                        <Button label="Voir l’événement" />
                      </Link>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}
      </Container>
    </div>
  );
}
