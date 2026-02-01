import { useMemo, useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";

import type { AdminOutletContext } from "./../AdminDashboard";
import { supabase } from "../../../gateways/supabase/supabaseClient";

import { useAdminSingleEventData } from "../../../features/admin/hooks/useAdminSingleEventData";
import { useUpdateEvent } from "../../../features/admin/hooks/useUpdateEvent";

import type { UpdateEventFullPatch } from "../../../domain/models/admin/admin.updateEventFullPatch.schema";

import { uploadOrgAssetsRepo } from "../../../gateways/supabase/repositories/dashboard/uploadOrgAssets.repo";

import { SingleEventDetailsSection } from "../../../pages/admin/singleEvent/sections/SingleEventDetailsSection";
import { SingleEventTicketsSection } from "../../../pages/admin/singleEvent/sections/SingleEventTicketsSection";
import { SingleEventFormSection }    from "../../../pages/admin/singleEvent/sections/SingleEventFormSection";
import { SingleEventParticipantsSection } from "../../../pages/admin/singleEvent/sections/SingleEventParticipantsSection";

// ✅ Garde ton CSS global existant (tu peux le déplacer ensuite dans /styles/admin/)
import "../../../styles/admin/adminEventsPage.css";

// ✅ Imports CSS par section (tout dans /styles/admin/)
import "../../../styles/admin/adminSingleEvent.details.css";
import "../../../styles/admin/adminSingleEvent.tickets.css";
import "../../../styles/admin/adminSingleEvent.form.css";
import "../../../styles/admin/adminSingleEvent.participants.css";

type TabKey = "details" | "tickets" | "form" | "participants";

export function AdminSingleEventPage() {
  const { eventSlug } = useParams<{ eventSlug: string }>();
  const { orgId, refetch: refetchDashboard } = useOutletContext<AdminOutletContext>();

  const storageRepo = useMemo(() => uploadOrgAssetsRepo(supabase), []);
  const [tab, setTab] = useState<TabKey>("details");

  const { loading, error, data, eventId, refetch: refetchSingle } = useAdminSingleEventData({
    supabase,
    orgId,
    eventSlug,
    ordersLimit: 200,
    ordersOffset: 0,
    attendeesLimit: 200,
    attendeesOffset: 0,
  });

  const update = useUpdateEvent({ supabase });

  if (!eventSlug) {
    return (
      <div className="adminCard">
        <h2>Événement</h2>
        <p>Slug manquant.</p>
      </div>
    );
  }

  const event = data?.event ?? null;

  async function refreshAll() {
    if (typeof refetchSingle === "function") await refetchSingle();
    if (typeof refetchDashboard === "function") await refetchDashboard();
  }

  async function handleConfirmFullPatch(patch: UpdateEventFullPatch): Promise<void> {
    if (!event?.id) return;
    const next = await update.updateEvent({ eventId: event.id, patch });
    if (!next) return;
    await refreshAll();
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
              <SingleEventDetailsSection
                event={event}
                updateError={update.error}
                onConfirm={handleConfirmFullPatch}
                onUploadBanner={uploadEventBanner}
              />
            )}

            {tab === "tickets" && (
              <SingleEventTicketsSection
                orgId={orgId}
                event={event}
                data={data as any}
                onChanged={refreshAll}
              />
            )}

            {tab === "form" && (
              <SingleEventFormSection
                event={event}
                data={data as any}
                onChanged={refreshAll}
              />
            )}

            {tab === "participants" && (
              <SingleEventParticipantsSection data={data as any} />
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
    <button onClick={onClick} className={active ? "adminEventTab isActive" : "adminEventTab"} type="button">
      {children}
    </button>
  );
}
