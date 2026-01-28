import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../gateways/supabase/supabaseClient";
import { usePublicEventDetail } from "../../features/admin/hooks/usePublicEventDetail";

import Container from "../../ui/components/container/Container";
import Card, { CardBody, CardHeader } from "../../ui/components/card/Card";
import Button from "../../ui/components/button/Button";

import { PublicEventHeader } from "./checkout/PublicEventHeader";
import { clearDraft, formatMoney, loadDraft, saveDraft } from "./checkout/checkoutStore";

import "../../styles/publicPages.css";

export function EventPaymentPage() {
  const navigate = useNavigate();
  const { orgSlug, eventSlug } = useParams<{ orgSlug: string; eventSlug: string }>();

  const { loading, error, data } = usePublicEventDetail({
    supabase,
    orgSlug,
    eventSlug,
  });

  const [tick, setTick] = useState(0);

  const draft = useMemo(() => {
    if (!orgSlug || !eventSlug) return null;
    void tick;
    return loadDraft(orgSlug, eventSlug);
  }, [orgSlug, eventSlug, tick]);

  if (loading || !orgSlug || !eventSlug) {
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

  const { org, event, products } = data;

  const quantities = draft?.quantities ?? {};
  const accepted = draft?.acceptedTerms ?? false;

  const picked = products
    .map((p) => ({ p, qty: quantities[p.id] ?? 0 }))
    .filter((x) => x.qty > 0);

  const totalCents = picked.reduce((acc, x) => acc + x.qty * x.p.priceCents, 0);
  const currency = picked[0]?.p.currency ?? "EUR";

  const attendeesCount = picked.reduce((acc, x) => {
    if (!x.p.createsAttendees) return acc;
    return acc + x.qty * (x.p.attendeesPerUnit ?? 0);
  }, 0);

  function setAccepted(next: boolean) {
    if (!draft) return;
    saveDraft({ ...draft, acceptedTerms: next });
    setTick((t) => t + 1);
  }

  function goBack() {
    navigate(`/o/${orgSlug}/e/${eventSlug}/participants`);
  }

  async function pay() {
    // TODO: intégrer paiement (Stripe / Mollie / etc.)
    clearDraft(orgSlug, eventSlug);
    navigate(`/o/${orgSlug}/e/${eventSlug}/billets`);
  }

  return (
    <div className="publicPage">
      {org?.logoUrl ? (
        <Link to={`/o/${orgSlug}`} className="publicCornerLogoWrap">
          <img src={org.logoUrl} alt={org.slug} className="publicCornerLogo" />
        </Link>
      ) : null}

      <Container>
        <div className="publicSurface">
          <PublicEventHeader orgSlug={orgSlug} org={org} event={event} />

          <div className="publicDivider" />

          <div className="publicSectionTitle">Récapitulatif</div>

          {picked.length === 0 ? (
            <div className="publicEmpty">
              Aucun billet sélectionné. Reviens à l’étape “Billets”.
            </div>
          ) : (
            <div className="publicGutter">
              <div className="publicList">
                <Card>
                  <CardHeader title="Billets" />
                  <CardBody>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {picked.map(({ p, qty }) => (
                        <div
                          key={p.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 12,
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 800 }}>
                              {p.name} × {qty}
                            </div>
                            <div className="publicSubtitle">
                              {p.createsAttendees
                                ? `${p.attendeesPerUnit} participant(s) / billet`
                                : "Pas de participant créé"}
                            </div>
                          </div>
                          <div style={{ fontWeight: 800 }}>
                            {formatMoney(qty * p.priceCents, p.currency)}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="publicDivider" />

                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <div style={{ fontWeight: 800 }}>Total</div>
                      <div style={{ fontWeight: 800 }}>
                        {formatMoney(totalCents, currency)}
                      </div>
                    </div>

                    <div className="publicSubtitle" style={{ marginTop: 6 }}>
                      Participants à renseigner : {attendeesCount}
                    </div>
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader title="Paiement" />
                  <CardBody>
                    <div className="publicProse">
                      (À intégrer) Ici tu brancheras le module de paiement.
                    </div>

                    <label
                      style={{
                        display: "flex",
                        gap: 10,
                        alignItems: "center",
                        marginTop: 12,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={accepted}
                        onChange={(e) => setAccepted(e.target.checked)}
                        style={{ width: 18, height: 18 }}
                      />
                      <span style={{ fontWeight: 700 }}>
                        J’accepte les conditions et je confirme l’achat.
                      </span>
                    </label>
                  </CardBody>
                </Card>
              </div>
            </div>
          )}

          <div className="publicDivider" />

          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <Button variant="secondary" label="Retour" onClick={goBack} />
            <Button
              label="Payer"
              onClick={pay}
              disabled={picked.length === 0 || !accepted}
            />
          </div>
        </div>
      </Container>
    </div>
  );
}

/**
 * ✅ Rend le module compatible avec:
 * - import { EventPaymentPage } from "..."
 * - import EventPaymentPage from "..."
 */
export default EventPaymentPage;
