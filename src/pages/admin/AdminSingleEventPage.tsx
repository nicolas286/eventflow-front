import { useState, useMemo } from "react";
import { useOutletContext, useParams } from "react-router-dom";

import type { AdminOutletContext } from "./AdminDashboard";
import { supabase } from "../../gateways/supabase/supabaseClient";
import { useAdminSingleEventData } from "../../features/admin/hooks/useAdminSingleEventData";

import { useUpdateEvent } from "../../features/admin/hooks/useUpdateEvent";
import type { UpdateEventFullPatch } from "../../domain/models/admin/admin.updateEventFullPatch.schema";

import { EventDetailsForm } from "../../features/admin/events/singleEvent/EventDetailsForm";
import { EventTicketsPanel } from "../../features/admin/events/singleEvent/EventTicketsPanel";
import { EventRegistrationFormPanel } from "../../features/admin/events/singleEvent/EventRegistrationFormPanel";

import { uploadOrgAssetsRepo } from "../../gateways/supabase/repositories/dashboard/uploadOrgAssets.repo";

import "../../styles/adminEventsPage.css";

type TabKey = "details" | "tickets" | "form" | "participants";

export function AdminSingleEventPage() {
  const { eventSlug } = useParams<{ eventSlug: string }>();
  const { orgId, refetch: refetchDashboard } =
    useOutletContext<AdminOutletContext>();

  const storageRepo = useMemo(() => uploadOrgAssetsRepo(supabase), []);

  const [tab, setTab] = useState<TabKey>("details");

  const {
    loading,
    error,
    data,
    eventId,
    refetch: refetchSingle,
  } = useAdminSingleEventData({
    supabase,
    orgId,
    eventSlug,
    ordersLimit: 200,
    ordersOffset: 0,
    attendeesLimit: 200,
    attendeesOffset: 0,
  });

  const update = useUpdateEvent({ supabase });

  const [eventOverride, setEventOverride] = useState<any | null>(null);

  if (!eventSlug) {
    return (
      <div className="adminCard">
        <h2>Événement</h2>
        <p>Slug manquant.</p>
      </div>
    );
  }

  const baseEvent = data?.event ?? null;
  const event =
    eventOverride && baseEvent && eventOverride.id === baseEvent.id
      ? eventOverride
      : baseEvent;

  async function handleConfirmFullPatch(
    patch: UpdateEventFullPatch
  ): Promise<void> {
    if (!event?.id) return;

    const next = await update.updateEvent({ eventId: event.id, patch });
    if (!next) return;

    setEventOverride(next);

    // ✅ refresh panels de la page single (si nécessaire)
    if (typeof refetchSingle === "function") await refetchSingle();

    // ✅ refresh liste events (écran global)
    if (typeof refetchDashboard === "function") await refetchDashboard();
  }

  async function uploadEventBanner(file: File) {
    if (!orgId) throw new Error("ORG_ID_MISSING");
    if (!event?.id) throw new Error("EVENT_ID_MISSING");

    return storageRepo.uploadEventBanner({
      orgId,
      eventId: event.id,
      file,
    });
  }

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
        <TabButton
          active={tab === "participants"}
          onClick={() => setTab("participants")}
        >
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
                key={event.updatedAt ?? event.id}  
                event={event}
                onConfirm={handleConfirmFullPatch}
                onUploadBanner={uploadEventBanner}
              />


                {update.error && (
                  <p style={{ color: "crimson" }}>{update.error}</p>
                )}
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
                    if (typeof refetchSingle === "function") await refetchSingle();
                    if (typeof refetchDashboard === "function") await refetchDashboard();
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
                    if (typeof refetchSingle === "function") await refetchSingle();
                    if (typeof refetchDashboard === "function") await refetchDashboard();
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

function TabButton(props: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
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
