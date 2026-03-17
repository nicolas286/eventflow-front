import { useMemo } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";

import { Button } from "@shared/ui/components";
import { useWidgetTheme } from "../hooks/useWidgetTheme";
import { formatMoney } from "../../register/helpers/checkoutStore";

import "./WidgetConfirmationPage.css";

type WidgetConfirmationData = {
  orderId: string;
  buyerEmail: string;
  totalCents: number;
  currency: string;
  totalTickets: number;
  eventTitle: string;
  bookingToken?: string | null;
  status?: string | null;
  items?: Array<{
    name: string;
    quantity: number;
    totalCents: number;
    currency: string;
  }>;
};

export function WidgetConfirmationPage() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const theme = useWidgetTheme();

  const { orgSlug, eventSlug } = useParams<{
    orgSlug: string;
    eventSlug: string;
  }>();

  const confirmationKey =
    orgSlug && eventSlug
      ? `eventflow:widget:confirmation:${orgSlug}:${eventSlug}`
      : null;

  const data = useMemo<WidgetConfirmationData | null>(() => {
    if (!confirmationKey) return null;

    const raw = sessionStorage.getItem(confirmationKey);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as WidgetConfirmationData;
    } catch {
      return null;
    }
  }, [confirmationKey]);

  function goBackToEvents() {
    if (!orgSlug) return;
    navigate(`/widget/o/${orgSlug}${search}`);
  }

  if (!orgSlug || !eventSlug) {
    return <div className="widgetRoot">Confirmation introuvable.</div>;
  }

  if (!data) {
    return (
      <div
        className="widgetRoot"
        style={
          {
            "--widget-bg": theme.bg,
            "--widget-card": theme.card,
            "--widget-text": theme.text,
            "--widget-button": theme.button,
          } as React.CSSProperties
        }
      >
        <div className="widgetConfirmationCard">
          <h2>Confirmation</h2>
          <div className="widgetEmpty">Impossible de retrouver les détails de la réservation.</div>

          <div className="widgetRecap widgetRecapActions">
            <Button label="Retour aux événements" onClick={goBackToEvents} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="widgetRoot"
      style={
        {
          "--widget-bg": theme.bg,
          "--widget-card": theme.card,
          "--widget-text": theme.text,
          "--widget-button": theme.button,
        } as React.CSSProperties
      }
    >
      <div className="widgetConfirmationCard">
        <div className="widgetConfirmationPill">Réservation confirmée ✅</div>

        <h2>Merci !</h2>

        <p className="widgetConfirmationSubtitle">
          Votre réservation pour <strong>{data.eventTitle}</strong> est bien enregistrée.
        </p>

        <p className="widgetConfirmationSubtitle">
          Un email de confirmation sera envoyé à <strong>{data.buyerEmail}</strong>.
        </p>

        <div className="widgetConfirmationSection">
          <div className="widgetSectionTitle">Récapitulatif</div>

          <div className="widgetPaymentRows">
            {data.items?.map((it, idx) => (
              <div key={idx} className="widgetPaymentRow">
                <div>
                  <div className="widgetPaymentRowTitle">
                    {it.name} × {it.quantity}
                  </div>
                </div>
                <div className="widgetPaymentAmount">
                  {formatMoney(it.totalCents, it.currency)}
                </div>
              </div>
            ))}
          </div>

          <div className="widgetDivider" />

          <div className="widgetPaymentTotalRow">
            <div>Total</div>
            <div>{formatMoney(data.totalCents, data.currency)}</div>
          </div>

          <div className="widgetPaymentInfos">
            <div>Billets : {data.totalTickets}</div>
            <div>Commande : {data.orderId}</div>
          </div>
        </div>

        <div className="widgetRecap widgetRecapActions">
          <Button variant="secondary" label="Retour aux événements" onClick={goBackToEvents} />
        </div>
      </div>

      <div className="widgetFooter">
        Billetterie par{" "}
        <a href="https://useeventflow.eu" target="_blank" rel="noopener noreferrer">
          Eventflow
        </a>
      </div>
    </div>
  );
}

export default WidgetConfirmationPage;