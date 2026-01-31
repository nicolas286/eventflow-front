import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";

import { supabase } from "../../gateways/supabase/supabaseClient";
import { usePublicEventDetail } from "../../features/admin/hooks/usePublicEventDetail";

import Container from "../../ui/components/container/Container";
import Card, { CardBody } from "../../ui/components/card/Card";

import { PublicEventHeader } from "./checkout/PublicEventHeader";

import "../../styles/publicCheckoutBase.css";
import "../../styles/public/orderReturnPage.css";

type OrderStatus = "open" | "pending" | "paid" | "failed" | "canceled" | "expired" | "awaiting_payment";

type OrderItemPublic = {
  name?: string;
  quantity?: number;
  unitPriceCents?: number;
  totalCents?: number;
  currency?: string;
};

type OrderPublic = {
  id: string;
  status: OrderStatus;
  totalCents?: number;
  currency?: string;

  // 🔑 pour retrouver l’event et rediriger vers l’org
  orgSlug?: string;
  eventSlug?: string;

  buyerEmail?: string;
  items?: OrderItemPublic[];
};

function isFinal(status: OrderStatus) {
  return status === "paid" || status === "failed" || status === "canceled" || status === "expired";
}

function formatMoney(cents?: number, currency?: string) {
  const c = typeof cents === "number" ? cents : 0;
  const cur = currency || "EUR";
  try {
    return new Intl.NumberFormat("fr-BE", { style: "currency", currency: cur }).format(c / 100);
  } catch {
    return `${(c / 100).toFixed(2)} ${cur}`;
  }
}

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

async function fetchOrder(orderId: string): Promise<OrderPublic> {
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/order-public?orderId=${encodeURIComponent(orderId)}`,
    {
      headers: {
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
    }
  );

  if (!res.ok) throw new Error("order_fetch_failed");
  const j = await res.json();

  return {
    id: j.id,
    status: j.status,

    totalCents: j.totalCents ?? j.total_cents ?? undefined,
    currency: j.currency ?? undefined,

    // ✅ IMPORTANT : on récupère orgSlug/eventSlug si dispo côté edge function
    orgSlug: j.orgSlug ?? j.org_slug ?? j.organizationSlug ?? j.organization_slug ?? undefined,
    eventSlug: j.eventSlug ?? j.event_slug ?? undefined,

    buyerEmail: j.buyerEmail ?? j.buyer_email ?? undefined,

    items: Array.isArray(j.items)
      ? j.items.map((it: any) => ({
          name: it.name ?? it.productName ?? it.product_name ?? undefined,
          quantity: it.quantity ?? undefined,
          unitPriceCents: it.unitPriceCents ?? it.unit_price_cents ?? undefined,
          totalCents: it.totalCents ?? it.total_cents ?? undefined,
          currency: it.currency ?? undefined,
        }))
      : undefined,
  };
}

export function OrderReturnPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [search] = useSearchParams();
  const navigate = useNavigate();

  const isReturn = useMemo(() => search.get("return") === "1", [search]);

  // ✅ on permet aussi de passer org/event dans l’URL si besoin
  const orgSlugFromQuery = search.get("org") ?? search.get("orgSlug") ?? null;
  const eventSlugFromQuery = search.get("event") ?? search.get("eventSlug") ?? null;

  const [order, setOrder] = useState<OrderPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  // countdown (paid)
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownRef = useRef<number | null>(null);

  const verifying = useMemo(() => {
    if (!isReturn) return false;
    if (!order) return true;
    return !isFinal(order.status);
  }, [isReturn, order]);

  const orgSlug = useMemo(() => order?.orgSlug ?? orgSlugFromQuery ?? null, [order?.orgSlug, orgSlugFromQuery]);
  const eventSlug = useMemo(() => order?.eventSlug ?? eventSlugFromQuery ?? null, [order?.eventSlug, eventSlugFromQuery]);

  // ✅ on va chercher les infos event comme dans EventPaymentPage
  const { loading: eventLoading, data: eventData } = usePublicEventDetail({
    supabase,
    orgSlug,
    eventSlug,
  });

  const brandStyle = useMemo(() => {
    const org = (eventData as any)?.org ?? (eventData as any)?.organizationProfile;
    return getBrandStyle(org);
  }, [eventData]);

  const backUrl = useMemo(() => (orgSlug ? `/o/${orgSlug}` : "/"), [orgSlug]);

  useEffect(() => {
    if (!orderId) return;

    let cancelled = false;

    function stopPolling() {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      intervalRef.current = null;
      timeoutRef.current = null;
    }

    async function loadOnce() {
      try {
        const o = await fetchOrder(orderId);
        if (cancelled) return;
        setOrder(o);
        setLoading(false);
      } catch {
        if (cancelled) return;
        setError("Impossible de charger la commande.");
        setLoading(false);
      }
    }

    async function poll() {
      try {
        const o = await fetchOrder(orderId);
        if (cancelled) return;
        setOrder(o);
        if (isFinal(o.status)) stopPolling();
      } catch {
        // tolère
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
  }, [orderId, isReturn]);

  // ✅ démarrer countdown à paid
  useEffect(() => {
    if (order?.status !== "paid") {
      if (countdownRef.current) window.clearInterval(countdownRef.current);
      countdownRef.current = null;
      setCountdown(null);
      return;
    }

    if (countdownRef.current) return;

    setCountdown(10);

    countdownRef.current = window.setInterval(() => {
      setCountdown((c) => {
        const next = (c ?? 10) - 1;
        if (next <= 0) {
          if (countdownRef.current) window.clearInterval(countdownRef.current);
          countdownRef.current = null;
          navigate(backUrl, { replace: true });
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) window.clearInterval(countdownRef.current);
      countdownRef.current = null;
    };
  }, [order?.status, navigate, backUrl]);

  if (!orderId) return <Navigate to="/" replace />;

  // 🌀 Loading : spinner flèche
  if (loading) {
    return (
      <div className="publicPage" style={brandStyle}>
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
      <div className="publicPage" style={brandStyle}>
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
      <div className="publicPage" style={brandStyle}>
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

  // ✅ Header Event (comme EventPaymentPage)
  const orgForHeader = (eventData as any)?.org ?? (eventData as any)?.organizationProfile;
  const eventForHeader = (eventData as any)?.event ?? null;

  return (
    <div className="publicPage" style={brandStyle}>
      <Container>
        {/* Header event : on l’affiche quand on a les infos */}
        {orgSlug && eventForHeader ? (
          <PublicEventHeader orgSlug={orgSlug} org={orgForHeader} event={eventForHeader} />
        ) : null}

        <div className="orderReturnCenter">
          {/* verifying : spinner */}
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

                {/* petit hint event loading */}
                {orgSlug && eventSlug && eventLoading ? (
                  <div className="orderReturnHint">Chargement des infos de l’événement…</div>
                ) : null}
              </CardBody>
            </Card>
          ) : null}

          {/* paid */}
          {!verifying && order.status === "paid" ? (
            <Card className="orderReturnCard">
              <CardBody>
                <div className="orderReturnStatusPill orderReturnSuccess">Paiement réussi ✅</div>
                <h2 className="orderReturnTitle">Merci !</h2>
                <p className="orderReturnSubtitle">Ta commande est bien enregistrée.</p>

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
                              it.currency ?? order.currency
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="orderReturnFooter">
                  <div className="orderReturnCountdown">
                    Retour automatique dans <span className="orderReturnStrong">{countdown ?? 10}s</span>
                  </div>

                  <button className="orderReturnButton" onClick={() => navigate(backUrl, { replace: true })}>
                    Retour maintenant
                  </button>
                </div>
              </CardBody>
            </Card>
          ) : null}

          {/* failed/canceled/expired */}
          {!verifying && (order.status === "failed" || order.status === "canceled" || order.status === "expired") ? (
            <Card className="orderReturnCard">
              <CardBody>
                <div className="orderReturnStatusPill orderReturnWarn">Paiement non abouti</div>
                <h2 className="orderReturnTitle">Oups…</h2>
                <p className="orderReturnSubtitle">Statut : {order.status}</p>
                <div className="orderReturnFooter" style={{ justifyContent: "center" }}>
                  <button className="orderReturnButton" onClick={() => navigate(backUrl, { replace: true })}>
                    Retour à l’organisation
                  </button>
                </div>
              </CardBody>
            </Card>
          ) : null}

          {/* fallback */}
          {!verifying &&
          order.status !== "paid" &&
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
