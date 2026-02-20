import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useParams, useSearchParams, type To } from "react-router-dom";

import { supabase } from "../../gateways/supabase/supabaseClient";
import { usePublicEventDetail } from "../../features/admin/hooks/usePublicEventDetail";

import Container from "../../ui/components/container/Container";
import Card, { CardBody } from "../../ui/components/card/Card";
import Button from "../../ui/components/button/Button";

import { PublicEventHeader } from "./checkout/PublicEventHeader";
import { formatMoney } from "../../domain/helpers/normalize";

import "../../styles/desktop/publicCheckoutBase.desktop.css";
import "../../styles/desktop/public/orderReturnPage.desktop.css";
import "../../styles/mobile/public/orderReturnPage.mobile.css";

export type OrderStatus =
  | "open"
  | "pending"
  | "paid"
  | "failed"
  | "canceled"
  | "expired"
  | "awaiting_payment"
  | "partially_paid";

export type OrderItemPublic = {
  name?: string;
  quantity?: number;
  unitPriceCents?: number;
  totalCents?: number;
  currency?: string;
};

export type OrderPublic = {
  id: string;
  status: OrderStatus;
  totalCents?: number;
  currency?: string;

  orgSlug?: string;
  eventSlug?: string;

  buyerEmail?: string;
  items?: OrderItemPublic[];
};

/**
 * ✅ Pour cette page retour PSP, on considère "partially_paid" comme un état final + succès.
 * (sinon tu restes coincé en "Validation du paiement…")
 */
function isFinalForReturn(status: OrderStatus) {
  return (
    status === "paid" ||
    status === "partially_paid" ||
    status === "failed" ||
    status === "canceled" ||
    status === "expired"
  );
}

function isSuccessForReturn(status: OrderStatus) {
  return status === "paid" || status === "partially_paid";
}

async function fetchOrder(orderId: string, token: string): Promise<OrderPublic> {
  if (!orderId) throw new Error("order_fetch_failed");

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/order-public?orderId=${encodeURIComponent(
      orderId,
    )}&token=${encodeURIComponent(token)}`,
    {
      headers: {
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
    },
  );

  if (!res.ok) throw new Error("order_fetch_failed");
  const j = await res.json();

  return {
    id: j.id,
    status: j.status,

    totalCents: j.totalCents,
    currency: j.currency,

    orgSlug: j.orgSlug,
    eventSlug: j.eventSlug,

    buyerEmail: j.buyerEmail,

    items: Array.isArray(j.items)
      ? j.items.map((it: OrderItemPublic) => ({
          name: it.name,
          quantity: it.quantity,
          unitPriceCents: it.unitPriceCents,
          totalCents: it.totalCents,
          currency: it.currency,
        }))
      : undefined,
  };
}

export function OrderReturnPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [search] = useSearchParams();
  const navigate = useNavigate();

  /* ---------------- Query params (no useMemo: search ref not stable) ---------------- */

  const isReturn = search.get("return") === "1";
  const bookingToken = search.get("token") ?? search.get("bookingToken") ?? null;

  const orgSlugFromQuery = search.get("org") ?? search.get("orgSlug") ?? null;
  const eventSlugFromQuery = search.get("event") ?? search.get("eventSlug") ?? null;

  /* ---------------- State ---------------- */

  const [order, setOrder] = useState<OrderPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const verifying = useMemo(() => {
    if (!isReturn) return false;
    if (!order) return true;
    return !isFinalForReturn(order.status);
  }, [isReturn, order]);

  const orgSlug = useMemo(
    () => order?.orgSlug ?? orgSlugFromQuery ?? null,
    [order?.orgSlug, orgSlugFromQuery],
  );

  const eventSlug = useMemo(
    () => order?.eventSlug ?? eventSlugFromQuery ?? null,
    [order?.eventSlug, eventSlugFromQuery],
  );

  const { loading: eventLoading, data: eventData } = usePublicEventDetail({
    supabase,
    orgSlug,
    eventSlug,
  });

  const backUrl = useMemo(() => {
    if (orgSlug && eventSlug) return `/o/${orgSlug}/e/${eventSlug}`;
    if (orgSlug) return `/o/${orgSlug}`;
    return "/";
  }, [orgSlug, eventSlug]);

  /* ---------------- Polling paiement (retour PSP) ---------------- */

  useEffect(() => {
    if (!orderId || !bookingToken) return;

    const safeOrderId = orderId;
    const safeToken = bookingToken;

    let cancelled = false;

    function stopPolling() {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      intervalRef.current = null;
      timeoutRef.current = null;
    }

    async function loadOnce() {
      try {
        const o = await fetchOrder(safeOrderId, safeToken);
        if (cancelled) return;
        setOrder(o);
        setLoading(false);

        // ✅ si c'est déjà final dès le 1er fetch, on coupe direct
        if (isFinalForReturn(o.status)) stopPolling();
      } catch {
        if (cancelled) return;
        setError("Impossible de charger la commande.");
        setLoading(false);
      }
    }

    async function poll() {
      try {
        const o = await fetchOrder(safeOrderId, safeToken);
        if (cancelled) return;
        setOrder(o);
        if (isFinalForReturn(o.status)) stopPolling();
      } catch {
        // tolère (réseau / edge)
      }
    }

    loadOnce();

    if (isReturn) {
      intervalRef.current = window.setInterval(poll, 1500);
      timeoutRef.current = window.setTimeout(() => stopPolling(), 30_000);
    } else {
      stopPolling();
    }

    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [orderId, bookingToken, isReturn]);

  /* ---------------- Countdown auto-retour (React 19 safe) ---------------- */

  const [now, setNow] = useState(() => Date.now());
  const [paidStart, setPaidStart] = useState<number | null>(null);
  const navigatedRef = useRef(false);

  useEffect(() => {
    let alive = true;

    if (!order || !isSuccessForReturn(order.status)) {
      navigatedRef.current = false;
      queueMicrotask(() => {
        if (alive) setPaidStart(null);
      });
      return () => {
        alive = false;
      };
    }

    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);

      // initialise paidStart au premier tick seulement
      setPaidStart((prev) => (prev == null ? t : prev));
    }, 1000);

    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [order?.status]);

  const countdown = useMemo(() => {
    if (!order || !isSuccessForReturn(order.status)) return null;
    if (paidStart == null) return 10;

    const elapsed = Math.floor((now - paidStart) / 1000);
    return Math.max(0, 10 - elapsed);
  }, [order?.status, now, paidStart, order]);

  useEffect(() => {
    if (order && isSuccessForReturn(order.status) && countdown === 0 && !navigatedRef.current) {
      navigatedRef.current = true;
      navigate(backUrl as To, { replace: true });
    }
  }, [order?.status, countdown, navigate, backUrl, order]);

  /* ---------------- Guards / UI ---------------- */

  if (!orderId) return <Navigate to="/" replace />;

  if (!bookingToken) {
    return (
      <div className="publicPage">
        <Container>
          <div className="orderReturnCenter">
            <Card className="orderReturnCard">
              <CardBody>
                <h2 className="orderReturnTitle">Lien invalide</h2>
                <p className="orderReturnSubtitle">
                  Il manque le jeton de sécurité pour retrouver la commande.
                </p>
              </CardBody>
            </Card>
          </div>
        </Container>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="publicPage">
        <Container>
          <div className="orderReturnCenter">
            <div className="orderReturnLoading">
              <span className="orderReturnSpinner" aria-hidden="true" />
              <div>
                <div className="orderReturnLoadingTitle">Chargement…</div>
                <div className="orderReturnLoadingSub">Récupération de ta commande</div>
              </div>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  if (error) {
    return (
      <div className="publicPage">
        <Container>
          <div className="orderReturnCenter">
            <Card className="orderReturnCard">
              <CardBody>
                <h2 className="orderReturnTitle">Erreur</h2>
                <p className="orderReturnSubtitle">{error}</p>
              </CardBody>
            </Card>
          </div>
        </Container>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="publicPage">
        <Container>
          <div className="orderReturnCenter">
            <Card className="orderReturnCard">
              <CardBody>
                <h2 className="orderReturnTitle">Commande introuvable</h2>
              </CardBody>
            </Card>
          </div>
        </Container>
      </div>
    );
  }

  const orgForHeader = eventData?.org;
  const eventForHeader = eventData?.event ?? null;

  return (
    <div className="publicPage">
      <Container>
        {orgSlug && eventForHeader ? (
          <PublicEventHeader orgSlug={orgSlug} org={orgForHeader} event={eventForHeader} />
        ) : null}

        <div className="orderReturnCenter">
          {verifying ? (
            <Card className="orderReturnCard">
              <CardBody>
                <div className="orderReturnLoading">
                  <span className="orderReturnSpinner" aria-hidden="true" />
                  <div>
                    <div className="orderReturnLoadingTitle">Validation du paiement…</div>
                    <div className="orderReturnLoadingSub">
                      Cela peut prendre quelques secondes. Statut : <strong>{order.status}</strong>
                    </div>
                  </div>
                </div>

                {orgSlug && eventSlug && eventLoading ? (
                  <div className="orderReturnHint">Chargement des infos de l’événement…</div>
                ) : null}
              </CardBody>
            </Card>
          ) : null}

          {!verifying && isSuccessForReturn(order.status) ? (
            <Card className="orderReturnCard">
              <CardBody>
                <div className="orderReturnStatusPill orderReturnSuccess">
                  {order.status === "paid" ? "Paiement réussi ✅" : "Acompte reçu ✅"}
                </div>

                <h2 className="orderReturnTitle">Merci !</h2>
                <p className="orderReturnSubtitle">
                  {order.status === "paid"
                    ? "Ta commande est bien enregistrée."
                    : "Ton acompte est bien enregistré. Tu pourras compléter le paiement plus tard."}
                </p>

                <div className="orderReturnSection">
                  <div className="orderReturnSectionTitle">Détail de la commande</div>

                  <div className="orderReturnMeta">
                    <div>
                      <span className="orderReturnLabel">Commande :</span>
                      <span className="orderReturnStrong">{order.id}</span>
                    </div>

                    {order.buyerEmail ? (
                      <div>
                        <span className="orderReturnLabel">Email :</span>
                        <span className="orderReturnStrong">{order.buyerEmail}</span>
                      </div>
                    ) : null}

                    <div>
                      <span className="orderReturnLabel">Total :</span>
                      <span className="orderReturnStrong">
                        {formatMoney(order.totalCents, order.currency)}
                      </span>
                    </div>
                  </div>
                </div>

                {order.items?.length ? (
                  <div className="orderReturnSection">
                    <div className="orderReturnSectionTitle">Articles</div>
                    <div className="orderReturnItems">
                      {order.items.map((it, idx) => (
                        <div key={idx} className="orderReturnItemRow">
                          <div className="orderReturnItemLeft">
                            <div className="orderReturnItemName">{it.name ?? "Article"}</div>
                            <div className="orderReturnItemQty">Quantité : {it.quantity ?? 1}</div>
                          </div>
                          <div className="orderReturnItemPrice">
                            {formatMoney(
                              it.totalCents ?? (it.unitPriceCents ?? 0) * (it.quantity ?? 1),
                              it.currency ?? order.currency,
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="orderReturnFooter">
                  <div className="orderReturnCountdown">
                    Retour automatique dans{" "}
                    <span className="orderReturnStrong">{countdown ?? 10}s</span>
                  </div>

                  <Button onClick={() => navigate(backUrl as To, { replace: true })}>
                    Retour maintenant
                  </Button>
                </div>
              </CardBody>
            </Card>
          ) : null}

          {!verifying &&
          (order.status === "failed" || order.status === "canceled" || order.status === "expired") ? (
            <Card className="orderReturnCard">
              <CardBody>
                <div className="orderReturnStatusPill orderReturnWarn">Paiement non abouti</div>
                <h2 className="orderReturnTitle">Oups…</h2>
                <p className="orderReturnSubtitle">Statut : {order.status}</p>
                <div className="orderReturnFooter" style={{ justifyContent: "center" }}>
                  <Button onClick={() => navigate(backUrl as To, { replace: true })}>
                    Retour à l’organisation
                  </Button>
                </div>
              </CardBody>
            </Card>
          ) : null}

          {!verifying &&
          order.status !== "paid" &&
          order.status !== "partially_paid" &&
          order.status !== "failed" &&
          order.status !== "canceled" &&
          order.status !== "expired" ? (
            <Card className="orderReturnCard">
              <CardBody>
                <h2 className="orderReturnTitle">État de la commande</h2>
                <p className="orderReturnSubtitle">Statut : {order.status}</p>
              </CardBody>
            </Card>
          ) : null}
        </div>
      </Container>
    </div>
  );
}