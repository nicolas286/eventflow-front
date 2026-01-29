import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams, Navigate } from "react-router-dom";

type OrderStatus = "open" | "pending" | "paid" | "failed" | "canceled" | "expired";

type OrderPublic = {
  id: string;
  status: OrderStatus;
  totalCents?: number;
  currency?: string;
};

function isFinal(status: OrderStatus) {
  return status === "paid" || status === "failed" || status === "canceled" || status === "expired";
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
    totalCents: j.totalCents ?? undefined,
    currency: j.currency ?? undefined,
  };
}

export function OrderReturnPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [search] = useSearchParams();

  const isReturn = useMemo(() => search.get("return") === "1", [search]);

  const [order, setOrder] = useState<OrderPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  // ✅ verifying dérivé, pas un state
  const verifying = useMemo(() => {
    if (!isReturn) return false;
    if (!order) return true; // on attend le premier fetch
    return !isFinal(order.status);
  }, [isReturn, order]);

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

    // 1) fetch initial
    loadOnce();

    // 2) polling seulement si return=1
    if (isReturn) {
      intervalRef.current = window.setInterval(poll, 1500);
      timeoutRef.current = window.setTimeout(() => {
        stopPolling();
      }, 30_000);
    } else {
      stopPolling();
    }

    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [orderId, isReturn]);

  if (!orderId) return <Navigate to="/" replace />;

  if (loading) {
    return (
      <div className="pageCenter">
        <h2>Chargement…</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pageCenter">
        <h2>Erreur</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="pageCenter">
        <h2>Commande introuvable</h2>
      </div>
    );
  }

  if (verifying) {
    return (
      <div className="pageCenter">
        <h2>Validation du paiement…</h2>
        <p>Merci de patienter, cela peut prendre quelques secondes.</p>
        <p>
          Statut actuel : <strong>{order.status}</strong>
        </p>
      </div>
    );
  }

  if (order.status === "paid") {
    return (
      <div className="pageCenter">
        <h2>Paiement confirmé ✅</h2>
        <p>Merci, ta commande est bien enregistrée.</p>
      </div>
    );
  }

  if (order.status === "failed" || order.status === "canceled" || order.status === "expired") {
    return (
      <div className="pageCenter">
        <h2>Paiement non abouti</h2>
        <p>Statut : {order.status}</p>
        <p>Tu peux réessayer ou contacter l’organisateur.</p>
      </div>
    );
  }

  return (
    <div className="pageCenter">
      <h2>État de la commande</h2>
      <p>Statut : {order.status}</p>
    </div>
  );
}
