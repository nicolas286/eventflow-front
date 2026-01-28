  /**
   * ✅ Structure des données dispo dans la page :
   *
   * data: {
   *   org: {
   *     slug: string
   *     logoUrl: string (resolved)
   *     defaultEventBannerUrl: string (resolved)
   *   }
   *
   *   event: {
   *     id: string (uuid)
   *     slug: string
   *     title: string
   *     description: string | null
   *     location: string | null
   *     bannerUrl: string (resolved)
   *     startsAt: string | null (ISO)
   *     endsAt: string | null (ISO)
   *   }
   *
   *   products: Array<{
   *     id: string (uuid)
   *     name: string
   *     description: string | null
   *     priceCents: number
   *     currency: string
   *     stockQty: number | null
   *     createsAttendees: boolean
   *     attendeesPerUnit: number
   *     sortOrder: number
   *   }>
   *
   *   formFields: Array<{
   *     id: string (uuid)
   *     label: string
   *     fieldKey: string
   *     fieldType: string
   *     isRequired: boolean
   *     options: any
   *     sortOrder: number
   *   }>
   * }
   * // ✅ Comportement :
   * - Bannière OK mais fond plus clair
   * - Logo plus grand
   * - Wizard de réservation en 3 étapes : tickets → infos → récapitulatif + paiement
   * - utiliser createsAttendees et attendeesPerUnit pour demander X formulaires par billet
   * - Afficher les champs de formulaire demandés
   * - Sélection de chaque produit avec +/- (pas quantités négatives)
   * - Il faut au moins UN produit "gatekeeper" avec createsAttendees=true pour passer à l'étape suivante
   * - Afficher SOLD OUT sur TOUT l'événement si pas de produit gatekeeper dispo
   * - Afficher SOLD OUT sur le produit si stockQty === 0
   */
import { useParams, Link } from "react-router-dom";
import { supabase } from "../../gateways/supabase/supabaseClient";
import { usePublicEventDetail } from "../../features/admin/hooks/usePublicEventDetail";

import Container from "../../ui/components/container/Container";
import Card, { CardBody, CardHeader } from "../../ui/components/card/Card";
import Button from "../../ui/components/button/Button";
import Badge from "../../ui/components/badge/Badge";

import { formatDateTimeHuman } from "../../domain/helpers/dateTime";

import "../../styles/publicPages.css";

export function EventPublicPage() {
  const { orgSlug, eventSlug } = useParams<{
    orgSlug: string;
    eventSlug: string;
  }>();

  const { loading, error, data } = usePublicEventDetail({
    supabase,
    orgSlug,
    eventSlug,
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

  if (!data?.event) {
    return (
      <div className="publicPage">
        <Container>Événement introuvable.</Container>
      </div>
    );
  }

  const { org, event, products, formFields } = data;

  const startText = event.startsAt ? formatDateTimeHuman(event.startsAt) : null;
  const endText = event.endsAt ? formatDateTimeHuman(event.endsAt) : null;

  return (
    <div className="publicPage">
      {/* Fixed logo bottom-right */}
      {org?.logoUrl ? (
        <Link to={`/o/${orgSlug}`} className="publicCornerLogoWrap">
          <img src={org.logoUrl} alt={org.slug} className="publicCornerLogo" />
        </Link>
      ) : null}

      <Container>
        <div className="publicSurface">
          {/* Banner */}
          {event.bannerUrl ? (
            <>
              <div className="publicBannerWrap">
                <img
                  src={event.bannerUrl}
                  alt={event.title}
                  className="publicBanner"
                />

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

          {/* Header row: title + date + back */}
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

          <div className="publicDivider" />

          {event.description ? (
            <div className="publicProse" style={{ whiteSpace: "pre-wrap" }}>
              {event.description}
            </div>
          ) : (
            <div className="publicEmpty">
              Cet événement n’a pas encore de description.
            </div>
          )}
        </div>

        {/* PRODUCTS */}
        <div className="publicSectionTitle">Billets</div>

        {products.length === 0 ? (
          <div className="publicEmpty">Aucun produit disponible.</div>
        ) : (
          <div className="publicGutter">
            <div className="publicList">
              {products.map((p) => (
                <Card key={p.id}>
                  <CardHeader
                    title={p.name}
                    subtitle={`${p.priceCents} ${p.currency}`}
                    right={
                      <Badge
                        tone={p.stockQty === 0 ? "danger" : "success"}
                        label={p.stockQty === 0 ? "Épuisé" : "Disponible"}
                      />
                    }
                  />
                  <CardBody>
                    <Button label="Choisir" />
                  </CardBody>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* FORM FIELDS */}
        <div className="publicSectionTitle">Informations demandées</div>

        <div className="publicGutter">
          <div className="publicGrid2">
            {formFields.map((f) => (
              <Card key={f.id}>
                <CardHeader
                  title={f.label}
                  subtitle={`${f.fieldType} · ${f.fieldKey}`}
                  right={
                    <Badge
                      tone={f.isRequired ? "warn" : "neutral"}
                      label={f.isRequired ? "Requis" : "Optionnel"}
                    />
                  }
                />
                <CardBody>
                  Ce champ sera demandé lors de l’inscription.
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      </Container>
    </div>
  );
}
