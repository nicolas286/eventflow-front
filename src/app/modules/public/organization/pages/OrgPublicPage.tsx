import { useParams } from "react-router-dom";
import { supabase } from "@gateways/supabase/supabaseClient";
import { usePublicOrgData } from "../hooks/usePublicOrgData";

import Container from "@ui/components/container/Container";
import Button from "@ui/components/button/Button";
import { Seo } from "@shared/ui/components/seo/Seo";
import { PublicOrgHero } from "../components/hero/PublicOrgHero";
import { OrgEventCard } from "../components/OrgEventCard/OrgEventCard";

import { useNow } from "./useNow";
import { useOrgEventFilters } from "./useOrgEventFilters";

import "./OrgPublicPage.css";

export function OrgPublicPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();

  const { loading, error, org, profile, events } = usePublicOrgData({
    supabase,
    orgSlug,
  });

  const nowTs = useNow();

  const {
    query,
    setQuery,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    sortKey,
    setSortKey,
    sortDir,
    setSortDir,
    filtersOpen,
    setFiltersOpen,
    filteredSortedEvents,
    hasActiveFilters,
    resetFilters,
  } = useOrgEventFilters(events ?? [], nowTs);

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
            website={profile.website}
          />

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
                  {events.length !== filteredSortedEvents.length ? " (filtré)" : ""}
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
                    onChange={(e) => setSortKey(e.target.value as typeof sortKey)}
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
                    onChange={(e) => setSortDir(e.target.value as typeof sortDir)}
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
              {filteredSortedEvents.map((e) => (
                <OrgEventCard key={e.id} e={e} nowTs={nowTs} orgSlug={orgSlug} />
              ))}
            </div>
          )}
        </Container>
      </div>
    </>
  );
}