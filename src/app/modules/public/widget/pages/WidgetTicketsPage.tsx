import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { supabase } from "@gateways/supabase/supabaseClient";
import { usePublicEventDetail } from "../../events/hooks/usePublicEventDetail";
import { useWidgetTheme } from "../hooks/useWidgetTheme";
import { useLocation } from "react-router-dom";
import { useWidgetAutoResize } from "../hooks/useWidgetAutoResize";

import { Button } from "@shared/ui/components";
import { WidgetHeader } from "../components/WidgetHeader/WidgetHeader";

import {
  loadDraft,
  saveDraft,
  formatMoney,
} from "../../register/helpers/checkoutStore";

import {
  computeRemaining,
  computeTotalCents,
  computeNextQty,
  quantitiesToItems,
  resolveCurrency,
  sortBySortOrder,
  sumItemQuantities,
  resolveMaxQty,
} from "@helpers/logic";

import "./WidgetTicketsPage.css";
import { WidgetFooter } from "../components/WidgetFooter/WidgetFooter";
import { WidgetRoot } from "../components/WidgetRoot/WidgetRoot";
import { WidgetGrid } from "../components/WidgetGrid/WidgetGrid";

export function WidgetTicketsPage() {
  const navigate = useNavigate();
  const theme = useWidgetTheme();
  useWidgetAutoResize();

  const MAX_TICKETS = 4;


  const { orgSlug, eventSlug } = useParams<{
    orgSlug: string;
    eventSlug: string;
  }>();

  const { loading, error, data } = usePublicEventDetail({
    supabase,
    orgSlug,
    eventSlug,
  });

  const [tick, setTick] = useState(0);
  const { search } = useLocation();

  const draft = useMemo(() => {
    if (!orgSlug || !eventSlug) return null;
    void tick;
    return loadDraft(orgSlug, eventSlug);
  }, [orgSlug, eventSlug, tick]);

  if (loading || !orgSlug || !eventSlug) {
    return <div className="widgetRoot">Chargement…</div>;
  }

  if (error) {
    return <div className="widgetRoot">Erreur : {error}</div>;
  }

  if (!data?.event) {
    return <div className="widgetRoot">Événement introuvable</div>;
  }

  const { event, products } = data;

  const quantities = draft?.quantities ?? {};

  const sortedProducts = sortBySortOrder(products);
  const visibleProducts = sortedProducts.slice(0, MAX_TICKETS);


  const items = quantitiesToItems(quantities);
  const totalTickets = sumItemQuantities(items);

  const totalCents = computeTotalCents(items, sortedProducts);
  const currency = resolveCurrency(sortedProducts);

  function updateQty(productId: string, nextQty: number) {
    if (!draft) return;

    const p = sortedProducts.find((x) => x.id === productId);
    if (!p) return;

    const remaining = computeRemaining(p);
    const q = computeNextQty(nextQty, remaining);

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
    navigate(`/widget/o/${orgSlug}/e/${eventSlug}/participants${search}`);
  }

  function goBack() {
  navigate(`/widget/o/${orgSlug}${search}`);
  }

  return (
    <WidgetRoot theme={theme}>
      <WidgetHeader left={<Button className="widgetButton" variant="ghost" label="← Retour" onClick={goBack} />}
        title={event.title}/>

      <WidgetGrid>
        {visibleProducts.map((p) => {
  const qty = Number(quantities[p.id] ?? 0) || 0;

  const remaining = computeRemaining(p);
  const soldOut = remaining === 0 && remaining != null;

  const maxQty = resolveMaxQty(remaining);

  const moneyCurrency = p.currency ?? currency;

  return (
    <div
      key={p.id}
      className={`widgetEventCard ${soldOut ? "isSoldOut" : ""}`}
    >
      <div className="widgetEventTitle">{p.name}</div>

      <div style={{ fontSize: 13, opacity: 0.7 }}>
        {formatMoney(p.priceCents, moneyCurrency)}
      </div>

      {p.description && (
        <div className="widgetTicketDesc">
          {p.description}
        </div>
      )}

      <div className="widgetQtyBlock">
        <Button
        className="widgetButton"
          label="−"
          onClick={() => updateQty(p.id, qty - 1)}
          disabled={qty <= 0}
        />

        <input
          type="number"
          min={0}
          max={maxQty}
          value={qty}
          onChange={(e) => updateQty(p.id, Number(e.target.value))}
        />

        <Button
        className="widgetButton"
          label="+"
          onClick={() => updateQty(p.id, qty + 1)}
          disabled={soldOut || qty >= maxQty}
        />
      </div>
    </div>
  );
})}
      </WidgetGrid>

      {sortedProducts.length > MAX_TICKETS && (
    <div className="widgetMoreEvents">
      <Button
      className="widgetButton"
        variant="secondary"
        label="Voir tous les billets"
        onClick={() =>
          window.open(`/o/${orgSlug}/e/${eventSlug}/billets`, "_blank")
        }
      />
    </div>
  )}

      <div className="widgetRecap">
        <div>
          {totalTickets} billet(s) · {formatMoney(totalCents, currency)}
        </div>

        <Button
        className="widgetButton"
          label="Continuer"
          onClick={goNext}
          disabled={totalTickets <= 0}
        />
      </div>
      <WidgetFooter/>
    </WidgetRoot>
  );
}