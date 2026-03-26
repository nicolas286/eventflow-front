import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@gateways/supabase/supabaseClient";
import { usePublicOrgData } from "../hooks/usePublicOrgData";
import { useNavigate } from "react-router-dom";
import { useEventRibbon } from "../components/EventSoonRibbon/useEventRibbon";

import Container from "@ui/components/container/Container";
import Card, { CardBody } from "@ui/components/card/Card";
import Button from "@ui/components/button/Button";
import Badge from "@ui/components/badge/Badge";
import { Seo } from "@shared/ui/components/seo/Seo";
import { PublicOrgHero } from "../components/hero/PublicOrgHero";

import { formatDateTimeHuman, toDayEndISO, toDayStartISO, getDaysUntil, parseTs } from "@helpers/dateTime";
import { EventSoonRibbon } from "../components/EventSoonRibbon/EventSoonRibbon";

import type { PublicEventOverview } from "../schemas/public.orgEventsOverview.schema";

import "./OrgPublicPage.css";
import { CalendarIcon, PinIcon, TicketIcon } from "@shared/ui/components/icon/Icons";

type SortKey = "date" | "name";
type SortDir = "asc" | "desc";


// ✅ “clé” temporelle pour filtrer le passé : endsAt si dispo, sinon startsAt
function getEventPastCutoffTs(e: PublicEventOverview) {
  return parseTs(e.endsAt) ?? parseTs(e.startsAt);
}

function getEventState(e: PublicEventOverview, nowTs: number) {
  const s = parseTs(e.startsAt);
  const end = parseTs(e.endsAt);

  if (s === null) return "unknown" as const;

  if (s > nowTs) return "upcoming" as const;

  // startsAt <= now
  if (end !== null) {
    if (end >= nowTs) return "ongoing" as const;
    return "past" as const;
  }

  // pas de endsAt => “en cours” dès que commencé
  return "ongoing" as const;
}

function getRegistrationMicrocopy(e: PublicEventOverview, nowTs: number) {
  const deadlineTs = parseTs(e.registrationDeadline);

  if (!deadlineTs) return null;

  const formatted = formatDateTimeHuman(e.registrationDeadline!);
  const daysLeft = getDaysUntil(deadlineTs, nowTs);

  if (!e.isRegistrationOpen) {
    return `Inscriptions clôturées le ${formatted}`;
  }

  if (daysLeft <= 1) {
    return `Clôture des inscriptions aujourd’hui`;
  }

  if (daysLeft <= 3) {
    return `Plus que ${daysLeft} jours pour réserver`;
  }

  return `Clôture des inscriptions le ${formatted}`;
}

export function OrgPublicPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();

  const { loading, error, org, profile, events } = usePublicOrgData({
    supabase,
    orgSlug,
  });

  const [query, setQuery] = useState("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const navigate = useNavigate();

  // ✅ “now” pur + refresh léger (pour que “à venir/en cours” bouge tout seul)
  const [nowTs, setNowTs] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowTs(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const filteredSortedEvents = useMemo(() => {
    const q = query.trim().toLowerCase();

    const fromTs = dateFrom ? Date.parse(toDayStartISO(dateFrom)) : null;
    const toTs = dateTo ? Date.parse(toDayEndISO(dateTo)) : null;

    // ✅ par défaut, on masque le passé (cutoff = now)
    // mais si l’utilisateur met "Du", ça override
    const baseFrom = fromTs ?? nowTs;

    const base = (events ?? []).filter((e) => {
      // search
      if (q) {
        const hay = `${e.title ?? ""} ${e.location ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      // si pas de date -> visible (ou mets false si tu veux les cacher)
      const cutoffTs = getEventPastCutoffTs(e);
      if (cutoffTs === null) return true;

      // ✅ filtre passé: endsAt/startsAt doit être >= baseFrom
      if (cutoffTs < baseFrom) return false;

      // ✅ filtre "Au" : on compare sur startsAt (logique “date de début”)
      const startTs = parseTs(e.startsAt);
      if (toTs !== null && startTs !== null && startTs > toTs) return false;

      return true;
    });

    const dir = sortDir === "asc" ? 1 : -1;

    base.sort((a, b) => {
      if (sortKey === "name") {
        const A = (a.title ?? "").toLocaleLowerCase();
        const B = (b.title ?? "").toLocaleLowerCase();
        return A.localeCompare(B) * dir;
      }

      const aTs = parseTs(a.startsAt) ?? Number.POSITIVE_INFINITY;
      const bTs = parseTs(b.startsAt) ?? Number.POSITIVE_INFINITY;
      return (aTs - bTs) * dir;
    });

    return base;
  }, [events, query, dateFrom, dateTo, sortKey, sortDir, nowTs]);

  const hasActiveFilters = !!query.trim() || !!dateFrom || !!dateTo;

  const resetFilters = () => {
    setQuery("");
    setDateFrom("");
    setDateTo("");
    setSortKey("date");
    setSortDir("asc");
  };

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

  const baseUrl = import.meta.env.VITE_PUBLIC_BASE_URL; 
  const url = `${baseUrl}/o/${orgSlug}`;

  const title = `${profile.displayName} – Eventflow, la billetterie sans commission`;
  const desc = "Réservez vos billets";



  return (
        <>
        <Seo
          title={title}
          description={desc}
          canonicalUrl={url}
          ogTitle={title}
          ogDescription={desc}
          ogUrl={url}
        />
    <div className="publicPage publicOrgPage">
      <Container>

        <PublicOrgHero
          logoUrl={profile.logoUrl}
          displayName={profile.displayName}
          description={profile.description}
          publicEmail={profile.publicEmail}
          phone={profile.phone}
          website={profile.website}/>

        {/* Filtres + tri */}
          <div className={`publicEventsToolbar ${filtersOpen ? "isOpen" : ""}`}>
          <div className="publicEventsToolbarHeader">
            <div className="publicEventsToolbarHeaderLeft">
              <Button
                variant="secondary"
                label={filtersOpen ? "Masquer les filtres ▲" : "Afficher les filtres ▼"}
                onClick={() => setFiltersOpen((v) => !v)}
              />

              {hasActiveFilters ? (
                <Button
                  variant="secondary"
                  label="Réinitialiser"
                  onClick={resetFilters}
                />
              ) : null}
            </div>

            <div className="publicEventsToolbarHeaderRight">
              <span className="publicMuted">
                {filteredSortedEvents.length} événement{filteredSortedEvents.length > 1 ? "s" : ""}
                {events.length !== filteredSortedEvents.length ? ` (filtré)` : ""}
              </span>
            </div>
          </div>

          {filtersOpen ? (
            <div className="publicEventsToolbarRow">
              <div className="publicField">
                <div className="publicFieldLabel">Rechercher</div>
                <input
                  className="publicInput"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Titre, lieu…"
                  aria-label="Rechercher un événement"
                />
              </div>

              <div className="publicField">
                <div className="publicFieldLabel">Du</div>
                <input
                  className="publicInput"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  aria-label="Date de début"
                />
              </div>

              <div className="publicField">
                <div className="publicFieldLabel">Au</div>
                <input
                  className="publicInput"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  aria-label="Date de fin"
                />
              </div>

              <div className="publicField">
                <div className="publicFieldLabel">Trier par</div>
                <select
                  className="publicSelect"
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value as SortKey)}
                  aria-label="Clé de tri"
                >
                  <option value="date">Date</option>
                  <option value="name">Nom</option>
                </select>
              </div>

              <div className="publicField">
                <div className="publicFieldLabel">Ordre</div>
                <select
                  className="publicSelect"
                  value={sortDir}
                  onChange={(e) => setSortDir(e.target.value as SortDir)}
                  aria-label="Direction de tri"
                >
                  <option value="asc">Croissant</option>
                  <option value="desc">Décroissant</option>
                </select>
              </div>
            </div>
          ) : null}
        </div>

        {events.length === 0 ? (
          <div className="publicEmpty">Aucun événement publié.</div>
        ) : filteredSortedEvents.length === 0 ? (
          <div className="publicEmpty">Aucun événement ne correspond à vos filtres.</div>
        ) : (
          <div className="publicOrgEventsGrid">
            {filteredSortedEvents.map((e: PublicEventOverview) => {
                const banner = e.bannerUrl;

                const startText = e.startsAt ? formatDateTimeHuman(e.startsAt) : null;
                const endText = e.endsAt ? formatDateTimeHuman(e.endsAt) : null;

                const state = getEventState(e, nowTs);
                const isClosed = !e.isRegistrationOpen;

                const registrationMicrocopy = getRegistrationMicrocopy(e, nowTs);
                const ribbon = useEventRibbon(e, nowTs);

                const badge = e.isSoldOut ? (
                  <Badge tone="danger" label="Complet" />
                ) : isClosed ? (
                  <Badge tone="warn" label="Inscriptions clôturées" />
                ) : state === "upcoming" ? (
                  <Badge tone="info" label="À venir" />
                ) : state === "ongoing" ? (
                  <Badge tone="success" label="En cours" />
                ) : null;

                const ctaDisabled = e.isSoldOut || isClosed;
                const ctaLabel = e.isSoldOut
                  ? "Complet"
                  : isClosed
                    ? "Clôturé"
                    : "Réserver";

                const ctaTitle = e.isSoldOut
                  ? "Événement complet"
                  : isClosed
                    ? "Les inscriptions sont clôturées"
                    : "Voir les billets";

                return (
                  <Card key={e.id} className="publicOrgEventCard">
                    {ribbon ? <EventSoonRibbon label={ribbon.label} type={ribbon.type} /> : null}
                    {banner ? (
                      <div
                        className="publicOrgEventBanner"
                        style={{ backgroundImage: `url("${banner}")` }}
                        aria-label={e.title}
                      />
                    ) : null}

                    <CardBody className="publicOrgEventBody">
                      <div className="publicOrgEventTop">
                        <div className="publicOrgEventHeaderRow">
                          <div className="publicOrgEventTitle">{e.title}</div>
                          {badge}
                        </div>

                        <div className="publicOrgEventLocation">
                          <PinIcon />
                          {e.location ?? "Lieu à venir"}
                        </div>

                        {startText || endText ? (
                          <div className="publicOrgEventDates">
                            {startText ? (
                              <span>
                                <CalendarIcon />
                                {startText}
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                      </div>

                      <div className="publicOrgEventFooter">
                        <div className="publicOrgEventActions">
                          <Button
                            className="publicOrgEventCta"
                            variant="primary"
                            title={ctaTitle}
                            aria-label={ctaTitle}
                            onClick={() => {
                              if (!ctaDisabled) navigate(`/o/${orgSlug}/e/${e.slug}`);
                            }}
                            disabled={ctaDisabled}
                          >
                            <TicketIcon />
                            {ctaLabel}
                          </Button>
                        </div>

                        {registrationMicrocopy ? (
                          <div className="publicOrgEventReassurance">
                            {registrationMicrocopy}
                          </div>
                        ) : !ctaDisabled ? (
                          <div className="publicOrgEventReassurance">
                            Paiement sécurisé • Réservation immédiate
                          </div>
                        ) : isClosed && !e.isSoldOut ? (
                          <div className="publicOrgEventReassurance">
                            Les inscriptions sont clôturées pour cet événement
                          </div>
                        ) : null}
                      </div>
                                          </CardBody>
                  </Card>
                );
              })}
          </div>
        )}
      </Container>
    </div>
    </>
  );
}
