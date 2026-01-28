import { useState } from "react";
import { useParams, useOutletContext } from "react-router-dom";

import type { AdminOutletContext } from "./AdminDashboard";
import { supabase } from "../../gateways/supabase/supabaseClient";
import { useAdminSingleEventData } from "../../features/admin/hooks/useAdminSingleEventData";

type TabKey = "details" | "tickets" | "form" | "participants";

export function AdminSingleEventPage() {
  const { eventSlug } = useParams<{ eventSlug: string }>();
  const { orgId } = useOutletContext<AdminOutletContext>();

  const [tab, setTab] = useState<TabKey>("details");

  const { loading, error, data, eventId } = useAdminSingleEventData({
    supabase,
    orgId,
    eventSlug,
    ordersLimit: 50,
    ordersOffset: 0,
    attendeesLimit: 50,
    attendeesOffset: 0,
  });

  if (!eventSlug) {
    return (
      <div className="adminCard">
        <h2>Evénement</h2>
        <p>Slug manquant.</p>
      </div>
    );
  }

  return (
    <div className="adminCard">
      <h2>Evénement</h2>
      <div style={{ fontSize: 12, opacity: 0.8 }}>
        slug: <code>{eventSlug}</code>{" "}
        {eventId ? (
          <>
            • id: <code>{eventId}</code>
          </>
        ) : null}
      </div>

      {/* Onglets */}
      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <TabButton active={tab === "details"} onClick={() => setTab("details")}>
          Détails
        </TabButton>
        <TabButton active={tab === "tickets"} onClick={() => setTab("tickets")}>
          Tickets
        </TabButton>
        <TabButton active={tab === "form"} onClick={() => setTab("form")}>
          Formulaire d&apos;inscription
        </TabButton>
        <TabButton active={tab === "participants"} onClick={() => setTab("participants")}>
          Participants
        </TabButton>
      </div>

      <div style={{ marginTop: 16 }}>
        {loading && <p>Chargement…</p>}
        {error && <p style={{ color: "crimson" }}>{error}</p>}

        {!loading && !error && data && (
          <>
            {tab === "details" && (
              <>
                <h3>Détails</h3>
                <pre style={preStyle}>{JSON.stringify(data.event, null, 2)}</pre>
                <h4>Branding</h4>
                <pre style={preStyle}>{JSON.stringify(data.orgBranding, null, 2)}</pre>
              </>
            )}

            {tab === "tickets" && (
              <>
                <h3>Tickets</h3>
                <pre style={preStyle}>{JSON.stringify(data.products, null, 2)}</pre>
              </>
            )}

            {tab === "form" && (
              <>
                <h3>Formulaire d&apos;inscription</h3>
                <pre style={preStyle}>{JSON.stringify(data.formFields, null, 2)}</pre>
              </>
            )}

            {tab === "participants" && (
              <>
                <h3>Participants</h3>

                <h4>Attendees</h4>
                <pre style={preStyle}>{JSON.stringify(data.attendees, null, 2)}</pre>

                <h4>Réponses</h4>
                <pre style={preStyle}>{JSON.stringify(data.attendeeAnswers, null, 2)}</pre>

                <h4>Commandes</h4>
                <pre style={preStyle}>{JSON.stringify(data.orders, null, 2)}</pre>

                <h4>Order items</h4>
                <pre style={preStyle}>{JSON.stringify(data.orderItems, null, 2)}</pre>

                <h4>Paiements</h4>
                <pre style={preStyle}>{JSON.stringify(data.payments, null, 2)}</pre>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function TabButton(props: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  const { active, onClick, children } = props;
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 10px",
        borderRadius: 10,
        border: "1px solid #e5e7eb",
        background: active ? "#111827" : "white",
        color: active ? "white" : "#111827",
        fontSize: 13,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

const preStyle: React.CSSProperties = {
  background: "#0b1020",
  color: "#e5e7eb",
  padding: 12,
  borderRadius: 12,
  overflowX: "auto",
  fontSize: 12,
};
