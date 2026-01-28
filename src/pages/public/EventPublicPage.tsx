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

  return (
    <div className="publicPage">
      {/* Fixed corner logo */}
      {org?.logoUrl ? (
        <Link
          to={`/o/${orgSlug}`}
          className="publicCornerLogoWrap"
          aria-label="Retour à l'organisation"
          title={org.slug}
        >
          <img src={org.logoUrl} alt={org.slug} className="publicCornerLogo" />
        </Link>
      ) : null}

      <Container>
        {/* HERO surface */}
        <div className="publicSurface">
          <div className="publicHero">
            <div className="publicBrand">
              {org?.logoUrl ? (
                <img src={org.logoUrl} alt={org.slug} className="publicLogo" />
              ) : null}

              <div className="publicTitleBlock">
                <h1 className="publicTitle">{event.title}</h1>
                <div className="publicSubtitle">
                  {event.location ?? "Lieu à venir"}
                </div>
              </div>
            </div>

            <div className="publicActions">
              <Link to={`/o/${orgSlug}`}>
                <Button variant="secondary" label="Retour" />
              </Link>
            </div>
          </div>

          {event.bannerUrl ? (
            <img
              src={event.bannerUrl}
              alt={event.title}
              className="publicBanner"
            />
          ) : null}

          {event.startsAt ? (
            <div className="publicMetaRow">
              <Badge
                tone="info"
                label={`Début : ${formatDateTimeHuman(event.startsAt)}`}
              />
              {event.endsAt ? (
                <Badge
                  tone="neutral"
                  label={`Fin : ${formatDateTimeHuman(event.endsAt)}`}
                />
              ) : null}
            </div>
          ) : null}

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
                <Card key={p.id} style={{ width: "100%" }}>
                  <CardHeader
                    title={<div className="publicCardTitle">{p.name}</div>}
                    subtitle={
                      <div className="publicSubtitle">
                        {p.priceCents} {p.currency}
                      </div>
                    }
                    right={
                      <Badge
                        tone={p.stockQty === 0 ? "danger" : "success"}
                        label={p.stockQty === 0 ? "Épuisé" : "Disponible"}
                      />
                    }
                  />
                  <CardBody>
                    {p.description ? (
                      <div className="publicCardText">{p.description}</div>
                    ) : null}

                    <div className="publicMetaRow">
                      <span>Stock : {p.stockQty ?? "∞"}</span>
                      <span>Places/unité : {p.attendeesPerUnit}</span>
                    </div>

                    <div style={{ marginTop: 12 }}>
                      <Button label="Choisir" />
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* FORM FIELDS */}
        <div className="publicSectionTitle">Informations demandées</div>

        {formFields.length === 0 ? (
          <div className="publicEmpty">Aucun champ requis.</div>
        ) : (
          <div className="publicGutter">
            <div className="publicGrid2">
              {formFields.map((f) => (
                <Card key={f.id} style={{ width: "100%" }}>
                  <CardHeader
                    title={<div className="publicCardTitle">{f.label}</div>}
                    subtitle={
                      <div className="publicSubtitle">
                        {f.fieldType} · {f.fieldKey}
                      </div>
                    }
                    right={
                      <Badge
                        tone={f.isRequired ? "warn" : "neutral"}
                        label={f.isRequired ? "Requis" : "Optionnel"}
                      />
                    }
                  />
                  <CardBody>
                    <div className="publicCardText">
                      Ce champ sera demandé lors de l’inscription.
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          </div>
        )}
      </Container>
    </div>
  );
}
