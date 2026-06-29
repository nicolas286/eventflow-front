import { useMemo } from "react";
import { useOutletContext, useParams, useNavigate } from "react-router-dom";

import type { AdminOutletContext } from "../../dashboard/components/AdminDashboard";
import { supabase } from "@gateways/supabase/supabaseClient";

import { useAdminSingleEventCoreData } from "../hooks/useAdminSingleEventCoreData";
import { useAdminSingleEventPageParams } from "../hooks/useAdminSingleEventPageParams";
import { useUpdateEvent } from "../hooks/useUpdateEvent";

import type { UpdateEventFullPatch } from "../schemas/admin.updateEventFullPatch.schema";

import { uploadOrgAssetsRepo } from "@gateways/supabase/repositories/dashboard/uploadOrgAssets.repo";
import type { UploadResult } from "@gateways/supabase/repositories/dashboard/uploadOrgAssets.repo";

import { SingleEventDetailsSection } from "../components/SingleEventDetailsTab";
import { SingleEventTicketsSection } from "../../tickets/components/SingleEventTicketsSection";
import { SingleEventFormSection } from "../../forms/components/SingleEventFormTab";
import { SingleEventParticipantsSection } from "../../orders/components/SingleEventParticipantsSection";
import { AdminSingleEventTabs } from "../components/AdminSingleEventTabs";
import { SingleEventPromoCodesSection } from "../../promoCodes/components/SingleEventPromoCodesTabs";

export function AdminSingleEventPage() {
  const { eventSlug } = useParams<{ eventSlug: string }>();
  const { orgId, refetch: refetchDashboard } =
    useOutletContext<AdminOutletContext>();

  const navigate = useNavigate();

  const {
    tab,
    setTab,
    participantsTab,
    shouldOpenScanner,
    consumeScannerFlag,
    searchParams,
  } = useAdminSingleEventPageParams();

  const storageRepo = useMemo(() => uploadOrgAssetsRepo(supabase), []);

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

  async function handleConfirmFullPatch(
    patch: UpdateEventFullPatch
  ): Promise<void> {
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
      navigate(`/admin/events/${nextSlug}?${searchParams.toString()}`, {
        replace: true,
      });
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

  const showCoreLoading = core.loading;
  const showCoreError = core.error;

  return (
    <div className="adminCard">
      <h2 className="adminEventTitle">{headerTitle}</h2>

      <AdminSingleEventTabs activeTab={tab} onChange={setTab} />

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
                fieldsGroups={core.data.formFieldsGroups}
                onChanged={refreshAll}
              />
            )}

            {tab === "promoCodes" && (
            <SingleEventPromoCodesSection
              orgId={orgId}
              event={event}
              onChanged={refreshAll}
            />
          )}

            {tab === "participants" && (
              <SingleEventParticipantsSection
                key={`${eventSlug}-${
                  shouldOpenScanner ? "scanner" : participantsTab
                }`}
                orgId={orgId}
                eventSlug={eventSlug}
                event={event}
                products={core.data.products}
                formFields={core.data.formFields}
                formFieldsGroups={core.data.formFieldsGroups}
                onChanged={refreshAll}
                initialTab={shouldOpenScanner ? "tickets" : participantsTab}
                autoOpenScanner={shouldOpenScanner}
                onScannerAutoOpened={consumeScannerFlag}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}