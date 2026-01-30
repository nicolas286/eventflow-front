import { useEffect, useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";

import type { AdminOutletContext } from "./AdminDashboard";
import { supabase } from "../../gateways/supabase/supabaseClient";
import { useAdminSingleEventData } from "../../features/admin/hooks/useAdminSingleEventData";

import { EventDetailsForm } from "../../features/admin/events/singleEvent/EventDetailsForm";
import { EventTicketsPanel } from "../../features/admin/events/singleEvent/EventTicketsPanel";
import { EventRegistrationFormPanel } from "../../features/admin/events/singleEvent/EventRegistrationFormPanel";

import "../../styles/adminEventsPage.css";

type TabKey = "details" | "tickets" | "form" | "participants";

export function AdminSingleEventPage() {
  const { eventSlug } = useParams<{ eventSlug: string }>();
  const { orgId } = useOutletContext<AdminOutletContext>();

  const [tab, setTab] = useState<TabKey>("details");

  const { loading, error, data, eventId, refetch } = useAdminSingleEventData({
    supabase,
    orgId,
    eventSlug,
    ordersLimit: 200,
    ordersOffset: 0,
    attendeesLimit: 200,
    attendeesOffset: 0,
  });

  const [eventOverride, setEventOverride] = useState<any | null>(null);

  useEffect(() => {
    if (!data?.event) return;
    setEventOverride(null);
  }, [data?.event?.id]);

  if (!eventSlug) {
    return (
      <div className="adminCard">
        <h2>Événement</h2>
        <p>Slug manquant.</p>
      </div>
    );
  }

  const event = eventOverride ?? data?.event ?? null;

  return (
    <div className="adminCard">
      <h2>Événement</h2>

      <div style={{ fontSize: 12, opacity: 0.8 }}>
        slug: <code>{eventSlug}</code>{" "}
        {eventId ? (
          <>
            • id: <code>{eventId}</code>
          </>
        ) : null}
      </div>

      <div className="adminEventTabs">
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

        {!loading && !error && data && event && (
          <>
            {tab === "details" && (
              <div className="adminEventSection">
                <EventDetailsForm
                  supabase={supabase as any}
                  orgId={orgId}
                  event={event}
                  orgBranding={data.orgBranding}
                  onSaved={(next) => setEventOverride(next)}
                />
              </div>
            )}

            {tab === "tickets" && (
              <div className="adminEventSection">
                <EventTicketsPanel
                  supabase={supabase as any}
                  orgId={orgId}
                  event={event}
                  products={data.products ?? []}
                  orders={data.orders ?? []}
                  orderItems={data.orderItems ?? []}
                  payments={data.payments ?? []}
                  onChanged={async () => {
                    if (typeof refetch === "function") await refetch();
                  }}
                />
              </div>
            )}

            {tab === "form" && (
              <div className="adminEventSection">
                <EventRegistrationFormPanel
                  supabase={supabase as any}
                  event={event}
                  fields={data.formFields ?? []}
                  onChanged={async () => {
                    if (typeof refetch === "function") await refetch();
                  }}
                />
              </div>
            )}

            {tab === "participants" && (
              <>
                <h3>Participants</h3>
                <pre style={preStyle}>{JSON.stringify(data.attendees, null, 2)}</pre>
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
      className={active ? "adminEventTab isActive" : "adminEventTab"}
      type="button"
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
