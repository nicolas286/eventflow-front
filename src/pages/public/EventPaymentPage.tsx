import { useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { supabase } from "../../gateways/supabase/supabaseClient";
import { usePublicEventDetail } from "../../features/admin/hooks/usePublicEventDetail";

import Container from "../../ui/components/container/Container";
import Card, { CardBody, CardHeader } from "../../ui/components/card/Card";
import Button from "../../ui/components/button/Button";

import { Turnstile, type TurnstileRef } from "../../ui/components/Turnstile";

import { PublicEventHeader } from "./checkout/PublicEventHeader";
import {
  clearDraft,
  formatMoney,
  loadDraft,
  saveDraft,
  type CheckoutDraft,
} from "./checkout/checkoutStore";

import "../../styles/desktop/publicCheckoutBase.desktop.css";
import "../../styles/desktop/eventPaymentPage.desktop.css";

import { useRegister } from "../../features/public/register/useRegister";

function ensureDraft(orgSlug: string, eventSlug: string): CheckoutDraft {
  const d = loadDraft(orgSlug, eventSlug) as CheckoutDraft;
  return {
    orgSlug: d.orgSlug,
    eventSlug: d.eventSlug,
    quantities: d.quantities ?? {},
    attendees: d.attendees ?? [],
    acceptedTerms: d.acceptedTerms ?? false,
  };
}

export function EventPaymentPage() {
  const navigate = useNavigate();
  const { orgSlug: orgSlugParam, eventSlug: eventSlugParam } = useParams<{
    orgSlug: string;
    eventSlug: string;
  }>();

  const orgSlug = orgSlugParam ?? null;
  const eventSlug = eventSlugParam ?? null;

  const { loading, error, data } = usePublicEventDetail({
    supabase,
    orgSlug,
    eventSlug,
  });

  const [tick, setTick] = useState(0);

  const draft = useMemo(() => {
    if (!orgSlug || !eventSlug) return null;
    void tick;
    return ensureDraft(orgSlug, eventSlug);
  }, [orgSlug, eventSlug, tick]);

  const [buyerEmail, setBuyerEmail] = useState("");

  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileError, setTurnstileError] = useState<string | null>(null);
  const [pendingPay, setPendingPay] = useState(false);

  const turnstileRef = useRef<TurnstileRef | null>(null);
  const turnstileSiteKey = (import.meta.env.VITE_TURNSTILE_SITEKEY as string | undefined)?.trim() ?? "";

  const { register, loading: registering, error: registerError } = useRegister({ supabase });

  function persistDraft(next: CheckoutDraft) {
    saveDraft(next);
    setTick((t) => t + 1);
  }

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

  if (!draft) {
    return (
      <div className="publicPage">
        <Container>Draft introuvable.</Container>
      </div>
    );
  }

  const { org, event, products, formFields } = data;

  const quantities = draft.quantities;
  const accepted = draft.acceptedTerms ?? false;

  const picked = products
    .map((p) => ({ p, qty: quantities[p.id] ?? 0 }))
    .filter((x) => x.qty > 0);

  const totalCents = picked.reduce((acc, x) => acc + x.qty * x.p.priceCents, 0);
  const currency = picked[0]?.p.currency ?? "EUR";

  const depositCents = typeof event?.depositCents === "number" ? event.depositCents : 0;

  const dueNowCentsUi =
    totalCents <= 0
      ? 0
      : depositCents > 0
      ? Math.min(totalCents, depositCents)
      : totalCents;

  const hasDeposit = depositCents > 0 && totalCents > 0;

  const attendeesCount = picked.reduce((acc, x) => {
    if (!x.p.createsAttendees) return acc;
    return acc + x.qty * (x.p.attendeesPerUnit ?? 0);
  }, 0);

  const attendeesMismatch = attendeesCount !== (draft.attendees?.length ?? 0);

  function setAccepted(next: boolean) {
    if (!orgSlug || !eventSlug) return;
    const current = ensureDraft(orgSlug, eventSlug);
    persistDraft({ ...current, acceptedTerms: next });
  }

  function goBack() {
    navigate(`/o/${orgSlug}/e/${eventSlug}/participants`);
  }

  function buildAttendeesPayload(): Array<{
    eventProductId: string;
    answers?: Array<{ eventFormFieldId: string; value?: unknown }>;
  }> {
    const fieldIdByKey = new Map<string, string>();
    for (const f of formFields ?? []) {
      if (f?.fieldKey && f?.id) fieldIdByKey.set(String(f.fieldKey), String(f.id));
    }

    const expandedProductIds: string[] = [];
    for (const { p, qty } of picked) {
      if (!p.createsAttendees) continue;
      const perUnit = p.attendeesPerUnit ?? 0;
      const count = qty * perUnit;
      for (let i = 0; i < count; i++) expandedProductIds.push(p.id);
    }

    return (draft?.attendees ?? []).map((answersByKey, idx) => {
      const eventProductId = expandedProductIds[idx];
      const obj = (answersByKey ?? {}) as Record<string, unknown>;

      const answers = Object.entries(obj)
        .map(([key, value]) => {
          const id = fieldIdByKey.get(key);
          if (!id) return null;
          return { eventFormFieldId: id, value };
        })
        .filter(Boolean) as Array<{ eventFormFieldId: string; value?: unknown }>;

      return {
        eventProductId,
        answers: answers.length ? answers : undefined,
      };
    });
  }

  async function doRegister(withToken: string) {
    const items = picked.map(({ p, qty }) => ({
      eventProductId: p.id,
      quantity: qty,
    }));

    const payload = {
      eventId: event.id,
      items,
      attendees: buildAttendeesPayload(),
      buyerEmail: buyerEmail.trim(),
      turnstileToken: withToken,
    };

    return register(payload as any);
  }

  async function pay() {
    if (!orgSlug || !eventSlug) return;
    if (picked.length === 0) return;
    if (!accepted) return;
    if (attendeesMismatch) return;

    const email = buyerEmail.trim();
    if (!email) return;

    setTurnstileError(null);

    // Si pas de token, on exécute Turnstile et on attend le callback
    if (!turnstileToken) {
      if (!turnstileSiteKey) {
        setTurnstileError("Turnstile non configuré.");
        return;
      }
      setPendingPay(true);
      turnstileRef.current?.execute();
      return;
    }

    let r: any;
    try {
      r = await doRegister(turnstileToken);
    } catch {
      return;
    } finally {
      setPendingPay(false);
      // token one-shot : on le reset pour éviter réutilisation/expiry
      setTurnstileToken(null);
      turnstileRef.current?.reset();
    }

    if (r && typeof r === "object" && "error" in r) {
      return;
    }

    const orderId = typeof r?.orderId === "string" ? r.orderId : null;
    const status = typeof r?.status === "string" ? r.status : null;

    const bookingToken =
      typeof r?.bookingToken === "string" && r.bookingToken.trim() ? r.bookingToken.trim() : null;

    if (r?.ok === true && status === "paid" && orderId) {
      clearDraft(orgSlug, eventSlug);

      const url = bookingToken
        ? `/order/${orderId}?token=${encodeURIComponent(bookingToken)}&org=${encodeURIComponent(
            orgSlug
          )}&event=${encodeURIComponent(eventSlug)}`
        : `/order/${orderId}?org=${encodeURIComponent(orgSlug)}&event=${encodeURIComponent(eventSlug)}`;

      navigate(url);
      return;
    }

    if (r?.ok === true && status === "awaiting_payment") {
      const checkoutUrl = r?.checkoutUrl;

      clearDraft(orgSlug, eventSlug);

      if (typeof checkoutUrl === "string" && checkoutUrl.startsWith("http")) {
        window.location.assign(checkoutUrl);
        return;
      }

      if (orderId) {
        navigate(
          `/order/${orderId}?token=${encodeURIComponent(bookingToken ?? "")}&org=${encodeURIComponent(
            orgSlug
          )}&event=${encodeURIComponent(eventSlug)}`
        );
      }
      return;
    }

    if (orderId) {
      clearDraft(orgSlug, eventSlug);
      navigate(
        `/order/${orderId}?token=${encodeURIComponent(bookingToken ?? "")}&org=${encodeURIComponent(
          orgSlug
        )}&event=${encodeURIComponent(eventSlug)}`
      );
    }
  }

  // Quand on reçoit un token, si l'utilisateur avait cliqué Payer, on relance pay()
  async function onTurnstileToken(token: string) {
    setTurnstileToken(token);
    if (pendingPay) {
      // relance immédiatement le flow
      await pay();
    }
  }

  const canPay =
    picked.length > 0 &&
    accepted &&
    !registering &&
    !pendingPay &&
    !attendeesMismatch &&
    buyerEmail.trim().length > 0;

  return (
    <div className="publicPage">
      <Container>
        <div className="publicSurface">
          <PublicEventHeader orgSlug={orgSlug} org={org} event={event} />

          <div className="publicDivider" />
          <div className="publicSectionTitle">3/3 — Paiement</div>

          {picked.length === 0 ? (
            <div className="publicEmpty">Aucun billet sélectionné. Reviens à l’étape “Billets”.</div>
          ) : (
            <div className="publicGutter">
              <div className="publicList">
                <Card>
                  <CardHeader title="Récap" />
                  <CardBody>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {picked.map(({ p, qty }) => (
                        <div key={p.id} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
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
                          <div style={{ fontWeight: 800 }}>{formatMoney(qty * p.priceCents, p.currency ?? "EUR")}</div>
                        </div>
                      ))}
                    </div>

                    <div className="publicDivider" />

                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <div style={{ fontWeight: 800 }}>{hasDeposit ? "À payer maintenant" : "Total"}</div>
                        <div style={{ fontWeight: 800 }}>{formatMoney(dueNowCentsUi, currency)}</div>
                      </div>

                      {hasDeposit ? (
                        <>
                          <div className="publicSubtitle" style={{ marginTop: 6 }}>
                            Total commande : {formatMoney(totalCents, currency)}
                          </div>
                          <div className="publicSubtitle" style={{ marginTop: 2 }}>
                            Le solde sera à régler plus tard (selon les modalités de l’organisateur).
                          </div>
                        </>
                      ) : null}

                    <div className="publicSubtitle" style={{ marginTop: 6 }}>
                      Participants à renseigner : {attendeesCount}
                    </div>

                    {attendeesMismatch ? (
                      <div className="publicEmpty" style={{ marginTop: 12 }}>
                        Oups : le nombre de participants ne correspond pas aux billets sélectionnés. Reviens à l’étape “Participants”.
                      </div>
                    ) : null}
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader title="Contact & validation" />
                  <CardBody>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <div>
                        <div style={{ fontWeight: 800, marginBottom: 6 }}>Email acheteur</div>
                        <input
                          value={buyerEmail}
                          onChange={(e) => setBuyerEmail(e.target.value)}
                          placeholder="ex: moi@email.com"
                          style={{
                            width: "100%",
                            padding: "10px 12px",
                            borderRadius: 12,
                            border: "1px solid rgba(0,0,0,0.10)",
                            outline: "none",
                          }}
                          disabled={registering || pendingPay}
                        />
                      </div>

                      {turnstileSiteKey ? (
                        <div>
                          <div style={{ fontWeight: 800, marginBottom: 6 }}>Validation anti-bot</div>
                          <Turnstile
                            ref={turnstileRef}
                            siteKey={turnstileSiteKey}
                            onToken={onTurnstileToken}
                            onError={() => {
                              setPendingPay(false);
                              setTurnstileToken(null);
                              setTurnstileError("Impossible de valider (Turnstile). Réessaie ou recharge la page.");
                            }}
                            onExpired={() => {
                              setPendingPay(false);
                              setTurnstileToken(null);
                              setTurnstileError("Validation expirée. Réessaie.");
                            }}
                          />
                          {turnstileError ? (
                            <div className="publicEmpty" style={{ marginTop: 10 }}>
                              {turnstileError}
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <div className="publicEmpty">Turnstile non configuré (VITE_TURNSTILE_SITEKEY manquant).</div>
                      )}

                      <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <input
                          type="checkbox"
                          checked={accepted}
                          onChange={(e) => setAccepted(e.target.checked)}
                          style={{ width: 18, height: 18 }}
                          disabled={registering || pendingPay}
                        />
                        <span style={{ fontWeight: 700 }}>J’accepte les conditions et je confirme l’achat.</span>
                      </label>

                      {registerError ? <div className="publicEmpty">Erreur : {registerError}</div> : null}
                    </div>
                  </CardBody>
                </Card>
              </div>
            </div>
          )}

          <div className="publicDivider" />

          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <Button variant="primary" label="Retour" onClick={goBack} disabled={registering || pendingPay} />
            <Button
                  label={
                    totalCents === 0
                      ? registering || pendingPay
                        ? "Validation…"
                        : "Confirmer"
                      : registering || pendingPay
                      ? "Paiement…"
                      : `Payer ${formatMoney(dueNowCentsUi, currency)}`
                  }
                  onClick={pay}
                  disabled={!canPay}
                />
          </div>
        </div>
      </Container>
    </div>
  );
}
