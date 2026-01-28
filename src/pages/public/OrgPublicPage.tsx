  /**
   * ✅ Structure des données dispo dans la page :
   *
   * org: {
   *   id: string (uuid)
   *   type: "association" | "person"
   *   name: string
   * }
   *
   * profile: {
   *   slug: string
   *   displayName: string | null
   *   description: string | null
   *   publicEmail: string | null
   *   phone: string | null
   *   website: string | null
   *   logoUrl: string | null
   *   primaryColor: string | null
   *   defaultEventBannerUrl: string | null
   * }
   *
   * events: Array<{
   *   id: string (uuid)
   *   slug: string
   *   title: string
   *   location?: string | null
   *   description?: string | null
   *   bannerUrl?: string | null
   *   startsAt?: string | null (ISO)
   *   endsAt?: string | null (ISO)
   * }>
   */

import { useParams, Link } from "react-router-dom";
import { supabase } from "../../gateways/supabase/supabaseClient";
import { usePublicOrgData } from "../../features/admin/hooks/usePublicOrgData";

import Container from "../../ui/components/container/Container";
import Card, { CardBody, CardHeader } from "../../ui/components/card/Card";
import Button from "../../ui/components/button/Button";
import Badge from "../../ui/components/badge/Badge";

import { formatDateTimeHuman } from "../../domain/helpers/dateTime";

import "../../styles/publicPages.css";

export function OrgPublicPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();

  const { loading, error, org, profile, events } = usePublicOrgData({
    supabase,
    orgSlug,
  });

  if (loading) {
    return (
      <div className="publicPage">
        <Container>Chargement…</Container>
      </div>
    );
  }

  if (error) {
    return (
      <div className="publicPage">
        <Container>Erreur : {error}</Container>
      </div>
    );
  }

  if (!org || !profile) {
    return (
      <div className="publicPage">
        <Container>Organisation introuvable.</Container>
      </div>
    );
  }

  const displayName = profile.displayName ?? org.name;

  return (
    <div className="publicPage">
      {/* Fixed corner logo */}
      {profile.logoUrl ? (
        <Link
          to={`/o/${orgSlug ?? profile.slug}`}
          className="publicCornerLogoWrap"
          aria-label="Retour à l'organisation"
          title={displayName}
        >
          <img
            src={profile.logoUrl}
            alt={displayName}
            className="publicCornerLogo"
          />
        </Link>
      ) : null}

      <Container>
        {/* HERO as modern surface */}
        <div className="publicSurface">
          <div className="publicHero">
            <div className="publicBrand">
              {profile.logoUrl ? (
                <img
                  src={profile.logoUrl}
                  alt={displayName}
                  className="publicLogo"
                />
              ) : null}

              <div className="publicTitleBlock">
                <h1 className="publicTitle">{displayName}</h1>
                <div className="publicSubtitle">
                  {profile.slug} · {org.type}
                </div>
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

          <div className="publicDivider" />

          {profile.description ? (
            <div className="publicProse" style={{ whiteSpace: "pre-wrap" }}>
              {profile.description}
            </div>
          ) : (
            <div className="publicEmpty">Cette organisation n’a pas encore de description.</div>
          )}
        </div>

        {/* EVENTS */}
        <div className="publicSectionTitle">Événements</div>

        {events.length === 0 ? (
          <div className="publicEmpty">Aucun événement publié.</div>
        ) : (
          <div className="publicList">
            {events.map((e) => (
              <Card key={e.id} style={{ width: "100%" }}>
                <CardHeader
                  title={<div className="publicCardTitle">{e.title}</div>}
                  subtitle={
                    <div className="publicSubtitle">
                      {e.location ?? "Lieu à venir"}
                    </div>
                  }
                  right={e.startsAt ? <Badge tone="info" label="À venir" /> : null}
                />
                <CardBody>
                  {e.startsAt ? (
                    <div className="publicMetaRow">
                      <span>Début : {formatDateTimeHuman(e.startsAt)}</span>
                      {e.endsAt ? (
                        <span>Fin : {formatDateTimeHuman(e.endsAt)}</span>
                      ) : null}
                    </div>
                  ) : null}

                  <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
                    <Link to={`e/${e.slug}`}>
                      <Button label="Voir l’événement" />
                    </Link>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </Container>
    </div>
  );
}
