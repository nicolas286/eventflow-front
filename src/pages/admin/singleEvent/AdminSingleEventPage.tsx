import { useEffect, useMemo, useState } from "react";
import { useOutletContext, useParams, useSearchParams } from "react-router-dom";

import type { AdminOutletContext } from "./../AdminDashboard";
import { supabase } from "../../../gateways/supabase/supabaseClient";

import { useAdminSingleEventData } from "../../../features/admin/hooks/useAdminSingleEventData";
import { useUpdateEvent } from "../../../features/admin/hooks/useUpdateEvent";

import type { UpdateEventFullPatch } from "../../../domain/models/admin/admin.updateEventFullPatch.schema";

import { uploadOrgAssetsRepo } from "../../../gateways/supabase/repositories/dashboard/uploadOrgAssets.repo";
import Button from "../../../ui/components/button/Button";

import { SingleEventDetailsSection } from "../../../pages/admin/singleEvent/sections/SingleEventDetailsSection";
import { SingleEventTicketsSection } from "../../../pages/admin/singleEvent/sections/SingleEventTicketsSection";
import { SingleEventFormSection } from "../../../pages/admin/singleEvent/sections/SingleEventFormSection";
import { SingleEventParticipantsSection } from "../../../pages/admin/singleEvent/sections/SingleEventParticipantsSection";
import type { UploadResult } from "../../../gateways/supabase/repositories/dashboard/uploadOrgAssets.repo";

// ✅ Garde ton CSS global existant
import "../../../styles/desktop/admin/adminEventsPage.desktop.css";
import "../../../styles/mobile/admin/adminEventsPage.mobile.css";

// ✅ Imports CSS par section
import "../../../styles/desktop/admin/adminSingleEvent.details.desktop.css";
import "../../../styles/desktop/admin/adminSingleEvent.tickets.desktop.css";
import "../../../styles/desktop/admin/adminSingleEvent.form.desktop.css";
import "../../../styles/desktop/admin/adminSingleEvent.participants.desktop.css";

import "../../../styles/mobile/admin/adminSingleEvent.tickets.mobile.css";
import "../../../styles/mobile/admin/adminSingleEvent.participants.mobile.css";
import "../../../styles/mobile/admin/adminSingleEvent.form.mobile.css";

type TabKey = "details" | "tickets" | "form" | "participants";

const TAB_KEYS: TabKey[] = ["details", "tickets", "form", "participants"];
function isTabKey(v: string | null): v is TabKey {
  return !!v && (TAB_KEYS as string[]).includes(v);
}

export function AdminSingleEventPage() {
  const { eventSlug } = useParams<{ eventSlug: string }>();
  const { orgId, refetch: refetchDashboard } = useOutletContext<AdminOutletContext>();

  const storageRepo = useMemo(() => uploadOrgAssetsRepo(supabase), []);

  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl: TabKey = isTabKey(searchParams.get("tab")) ? (searchParams.get("tab") as TabKey) : "details";
  const [tab, setTab] = useState<TabKey>(tabFromUrl);

  useEffect(() => {
    if (tab !== tabFromUrl) setTab(tabFromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabFromUrl]);

  function setTabAndUrl(next: TabKey) {
    setTab(next);
    setSearchParams(
      (prev) => {
        const sp = new URLSearchParams(prev);
        sp.set("tab", next);
        return sp;
      },
      { replace: true }
    );
  }

  const { loading, error, data, refetch: refetchSingle } = useAdminSingleEventData({
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

  const headerTitle = event?.title?.trim()
    ? event.title
    : loading
      ? "Chargement…"
      : "Événement";

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

  async function uploadEventBanner(file: File): Promise<UploadResult> {
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
      {/* ✅ Titre = nom de l’événement */}
      <h2>{headerTitle}</h2>

      {/* ✅ Suppression de la ligne slug/id */}
      {/* (si tu veux garder l’id pour debug, dis-moi et je te le mets dans un <details> caché) */}

      <div className="adminEventTabs">
        <TabButton active={tab === "details"} onClick={() => setTabAndUrl("details")}>
          Détails
        </TabButton>
        <TabButton active={tab === "tickets"} onClick={() => setTabAndUrl("tickets")}>
          Tickets
        </TabButton>
        <TabButton active={tab === "form"} onClick={() => setTabAndUrl("form")}>
          Formulaire d&apos;inscription
        </TabButton>
        <TabButton active={tab === "participants"} onClick={() => setTabAndUrl("participants")}>
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
              <SingleEventTicketsSection orgId={orgId} event={event} data={data} onChanged={refreshAll} />
            )}

            {tab === "form" && <SingleEventFormSection event={event} data={data} onChanged={refreshAll} />}

            {tab === "participants" && (
              <SingleEventParticipantsSection data={data} onChanged={refreshAll} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function TabButton(props: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  const { active = false, onClick, children } = props;

  return (
    <Button type="button" onClick={onClick} className={`adminEventTab${active ? " isActive" : ""}`}>
      {children}
    </Button>
  );
}
