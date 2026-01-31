import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../gateways/supabase/supabaseClient";
import { usePublicEventDetail } from "../../features/admin/hooks/usePublicEventDetail";

import Container from "../../ui/components/container/Container";
import Card, { CardBody, CardHeader } from "../../ui/components/card/Card";
import Button from "../../ui/components/button/Button";
import Badge from "../../ui/components/badge/Badge";

import { PublicEventHeader } from "./checkout/PublicEventHeader";
import { loadDraft, saveDraft, formatMoney } from "./checkout/checkoutStore";

/* ✅ CSS */
import "../../styles/publicCheckoutBase.css";
import "../../styles/eventTicketsPage.css";

function hexToRgbTriplet(hex: string | null | undefined): string | null {
  if (!hex) return null;
  const h = hex.trim().replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  if (full.length !== 6) return null;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return null;
  return `${r} ${g} ${b}`;
}

function getBrandStyle(org: any): Record<string, string> | undefined {
  const hex =
    org?.primaryColor ??
    org?.primary_color ??
    org?.brandingPrimaryColor ??
    org?.organizationProfile?.primaryColor ??
    null;

  const rgb = hexToRgbTriplet(typeof hex === "string" ? hex : null);
  if (!rgb) return undefined;

  return {
    ["--primary" as any]: rgb,
    ["--primary-bg" as any]: rgb,
  } as Record<string, string>;
}

export function EventTicketsPage() {
  const navigate = useNavigate();
  const { orgSlug, eventSlug } = useParams<{ orgSlug: string; eventSlug: string }>();

  const { loading, error, data } = usePublicEventDetail({
    supabase,
    orgSlug,
    eventSlug,
  });

  const brandStyle = getBrandStyle((data as any)?.org ?? (data as any)?.organizationProfile);

  const [tick, setTick] = useState(0);

  const draft = useMemo(() => {
    if (!orgSlug || !eventSlug) return null;
    void tick;
    return loadDraft(orgSlug, eventSlug);
  }, [orgSlug, eventSlug, tick]);

  if (loading || !orgSlug || !eventSlug) {
    return (
      <div className="publicPage" style={brandStyle}>
        <Container>Chargement…</Container>
      </div>
    );
  }

  if (error) {
    return (
      <div className="publicPage" style={brandStyle}>
        <Container>Erreur : {error}</Container>
      </div>
    );
  }

  if (!data?.event) {
    return (
      <div className="publicPage" style={brandStyle}>
        <Container>Événement introuvable.</Container>
      </div>
    );
  }

  const { org, event, products } = data;
  const quantities = draft?.quantities ?? {};

  const sortedProducts = [...products].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  const totalTickets = Object.values(quantities).reduce((a, b) => a + b, 0);

  const totalCents = sortedProducts.reduce((acc, p) => {
    const qty = quantities[p.id] ?? 0;
    return acc + qty * p.priceCents;
  }, 0);

  const currency = sortedProducts[0]?.currency ?? "EUR";

  const attendeesToCreate = sortedProducts.reduce((acc, p) => {
    const qty = quantities[p.id] ?? 0;
    if (!p.createsAttendees) return acc;
    return acc + qty * (p.attendeesPerUnit ?? 0);
  }, 0);

  function clampQty(next: number, stockQty: number | null) {
    const min = 0;
    const max = stockQty == null ? 99 : Math.max(0, stockQty);
    return Math.max(min, Math.min(max, next));
  }

  function updateQty(productId: string, nextQty: number) {
    if (!draft) return;
    const p = sortedProducts.find((x) => x.id === productId);
    if (!p) return;

    const q = clampQty(nextQty, p.stockQty);

    const next = {
      ...draft,
      quantities: { ...draft.quantities, [productId]: q },
      attendees: [],
      acceptedTerms: false,
    };

    saveDraft(next);
    setTick((x) => x + 1);
  }

  function goNext() {
    navigate(`/o/${orgSlug}/e/${eventSlug}/participants`);
  }

  return (
    <div className="publicPage" style={brandStyle}>
      <Container>
        <div className="publicSurface">
          <PublicEventHeader orgSlug={orgSlug} org={org} event={event} />

          <div className="publicDivider" />

          <div className="publicSectionTitle">1/3 — Choisir vos billets</div>

          {sortedProducts.length === 0 ? (
            <div className="publicEmpty">Aucun billet disponible pour le moment.</div>
          ) : (
            <div className="publicGutter">
              <div className="publicList">
                {sortedProducts.map((p) => {
                  const qty = quantities[p.id] ?? 0;
                  const soldOut = p.stockQty === 0;
                  const stockLabel = p.stockQty == null ? "Illimité" : `Stock : ${p.stockQty}`;

                  const badgeTone = soldOut ? "danger" : "success";
                  const badgeLabel = soldOut ? "Épuisé" : "Disponible";

                  const maxQty = p.stockQty == null ? 99 : Math.max(0, p.stockQty);

                  const createsAtt = p.createsAttendees === true;
                  const perUnit = p.attendeesPerUnit ?? 0;
                  const createdCount = createsAtt ? qty * perUnit : 0;

                  return (
                    <Card key={p.id} className={soldOut ? "publicTicketCard isSoldOut" : "publicTicketCard"}>
                      <CardHeader
                        title={<div className="publicCardTitle">{p.name}</div>}
                        subtitle={
                          <div className="publicSubtitle">
                            {formatMoney(p.priceCents, p.currency)} · {stockLabel}
                          </div>
                        }
                        right={<Badge tone={badgeTone} label={badgeLabel} />}
                      />

                      <CardBody className="publicTicketBody">
                        <div className="publicTicketLayout">
                          <div className="publicTicketLeft">
                            {p.description ? (
                              <div className="publicProse publicTicketDesc" style={{ whiteSpace: "pre-wrap" }}>
                                {p.description}
                              </div>
                            ) : null}

                            <div className="publicMetaRow">
                              {createsAtt ? (
                                <span>
                                  Participants : {perUnit} / billet
                                  {qty > 0 ? ` · ${createdCount} participant(s) à renseigner` : ""}
                                </span>
                              ) : (
                                <span>Ce billet ne demande pas de formulaire participant</span>
                              )}
                            </div>
                          </div>

                          <div className="publicTicketRight">
                            <div className="publicQtyBlock">
                              <Button
                                variant="secondary"
                                label="−"
                                onClick={() => updateQty(p.id, qty - 1)}
                                disabled={qty <= 0}
                                className="publicQtyBtn"
                              />

                              <input
                                type="number"
                                min={0}
                                max={maxQty}
                                value={qty}
                                onChange={(e) => updateQty(p.id, Number(e.target.value))}
                                className="publicQtyInput"
                                disabled={soldOut}
                              />

                              <Button
                                variant="secondary"
                                label="+"
                                onClick={() => updateQty(p.id, qty + 1)}
                                disabled={soldOut || qty >= maxQty}
                                className="publicQtyBtn"
                              />
                            </div>

                            <div className="publicTicketTotal">
                              {formatMoney(qty * p.priceCents, p.currency)}
                            </div>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          <div className="publicDivider" />

          <div className="publicRecapRow">
            <div>
              <div className="publicRecapTitle">Récap</div>
              <div className="publicSubtitle publicRecapSubtitle">
                {totalTickets} billet(s) · {attendeesToCreate} participant(s) à renseigner ·{" "}
                {formatMoney(totalCents, currency)}
              </div>
            </div>

            <Button label="Continuer (Participants)" onClick={goNext} disabled={totalTickets <= 0} />
          </div>
        </div>
      </Container>
    </div>
  );
}
