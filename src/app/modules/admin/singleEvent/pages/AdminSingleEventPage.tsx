import { useEffect, useMemo, useState } from "react";
import { useOutletContext, useParams, useSearchParams, useNavigate } from "react-router-dom";

import type { AdminOutletContext } from "../../dashboard/components/AdminDashboard";
import { supabase } from "@gateways/supabase/supabaseClient";

import { useAdminSingleEventCoreData } from "../hooks/useAdminSingleEventCoreData";
import { useUpdateEvent } from "../hooks/useUpdateEvent";

import type { UpdateEventFullPatch } from "../schemas/admin.updateEventFullPatch.schema";

import { uploadOrgAssetsRepo } from "@gateways/supabase/repositories/dashboard/uploadOrgAssets.repo";
import Button from "@ui/components/button/Button";

import { SingleEventDetailsSection } from "../components/SingleEventDetailsTab";
import { SingleEventTicketsSection } from "../../tickets/components/SingleEventTicketsSection";
import { SingleEventFormSection } from "../../forms/components/SingleEventFormTab";
import { SingleEventParticipantsSection } from "../../orders/components/SingleEventParticipantsSection";
import type { UploadResult } from "@gateways/supabase/repositories/dashboard/uploadOrgAssets.repo";

type TabKey = "details" | "tickets" | "form" | "participants";
export type ParticipantsTabKey = "participants" | "tickets";

const TAB_KEYS: TabKey[] = ["details", "tickets", "form", "participants"];
const PARTICIPANTS_TAB_KEYS: ParticipantsTabKey[] = ["participants", "tickets"];

function isTabKey(v: string | null): v is TabKey {
  return !!v && (TAB_KEYS as string[]).includes(v);
}

function isParticipantsTabKey(v: string | null): v is ParticipantsTabKey {
  return !!v && (PARTICIPANTS_TAB_KEYS as string[]).includes(v);
}

export function AdminSingleEventPage() {
  const { eventSlug } = useParams<{ eventSlug: string }>();
  const { orgId, refetch: refetchDashboard } = useOutletContext<AdminOutletContext>();

  const storageRepo = useMemo(() => uploadOrgAssetsRepo(supabase), []);

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const tabFromUrl: TabKey = isTabKey(searchParams.get("tab"))
    ? (searchParams.get("tab") as TabKey)
    : "details";

  const participantsTabFromUrl: ParticipantsTabKey = isParticipantsTabKey(searchParams.get("participantsTab"))
    ? (searchParams.get("participantsTab") as ParticipantsTabKey)
    : "participants";

  const shouldOpenScanner = searchParams.get("openScanner") === "1";

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

  const core = useAdminSingleEventCoreData({
    supabase,
    orgId,
    eventSlug,
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

  const event = core.data?.event ?? null;

  const headerTitle = event?.title?.trim()
    ? event.title
    : core.loading
      ? "Chargement…"
      : "Événement";

  async function refreshAll() {
    if (typeof core.refetch === "function") {
      await core.refetch();
    }

    if (typeof refetchDashboard === "function") {
      await refetchDashboard();
    }
  }

  async function handleConfirmFullPatch(patch: UpdateEventFullPatch): Promise<void> {
  if (!event?.id) return;

  const normalizedPatch: UpdateEventFullPatch = {
    ...patch,
    endsAt:
      typeof patch.endsAt === "string" && patch.endsAt.trim() === ""
        ? null
        : patch.endsAt,
  };

  const next = await update.updateEvent({
    eventId: event.id,
    patch: normalizedPatch,
  });

  if (!next) return;

  const nextSlug = (next.slug ?? "").trim();
  if (nextSlug && nextSlug !== eventSlug) {
    const sp = new URLSearchParams(searchParams);
    navigate(`/admin/events/${nextSlug}?${sp.toString()}`, { replace: true });
    return;
  }

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

  function handleScannerConsumed() {
    setSearchParams(
      (prev) => {
        const sp = new URLSearchParams(prev);
        sp.delete("openScanner");
        return sp;
      },
      { replace: true }
    );
  }

  const showCoreLoading = core.loading;
  const showCoreError = core.error;

  return (
    <div className="adminCard">
      <h2 className="adminEventTitle">{headerTitle}</h2>

      <div className="adminEventTabs">
        <div className="adminEventTabsInner">
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
      </div>

      <div style={{ marginTop: 16 }}>
        {showCoreLoading && <p>Chargement…</p>}
        {showCoreError && <p style={{ color: "crimson" }}>{showCoreError}</p>}

        {!showCoreLoading && !showCoreError && core.data && event && (
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
                products={core.data.products}
                onChanged={refreshAll}
              />
            )}

            {tab === "form" && (
              <SingleEventFormSection
                event={event}
                fields={core.data.formFields}
                onChanged={refreshAll}
              />
            )}

            {tab === "participants" && (
              <SingleEventParticipantsSection
                key={`${eventSlug}-${shouldOpenScanner ? "scanner" : participantsTabFromUrl}`}
                orgId={orgId}
                eventSlug={eventSlug}
                event={event}
                products={core.data.products}
                formFields={core.data.formFields}
                onChanged={refreshAll}
                initialTab={shouldOpenScanner ? "tickets" : participantsTabFromUrl}
                autoOpenScanner={shouldOpenScanner}
                onScannerAutoOpened={handleScannerConsumed}
              />
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