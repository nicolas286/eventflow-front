import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";

import {
  updateEventFullPatchSchema,
  type UpdateEventFullPatch,
} from "../../schemas/admin.updateEventFullPatch.schema";

import { Button, StickySaveBar } from "@ui/components";
import { FlexPanel } from "@ui/components/panels/FlexPanel";
import { EventDetailsFields } from "./EventDetailsFields";

import { isoToLocalInput, localInputToIso } from "@shared/helpers/dateTime";
import { bytesToMb } from "@shared/helpers/normalize";
import { centsToEuroInput, euroInputToCents } from "@shared/helpers/fields";
import { withCacheBust } from "@shared/helpers/url";

import type { AdminEventDetailEvent } from "../../schemas/admin.eventDetail.schema";
import { MessageBox } from "@shared/ui/components/message/MessageBox";
import { useToast } from "@shared/ui/components/toast/useToast";

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

type UploadResult = {
  path: string;
  publicUrl: string;
  publicUrlWithBust: string;
};

type Props = {
  event: AdminEventDetailEvent;
  updateError?: string | null;
  onConfirm: (patch: UpdateEventFullPatch) => Promise<void>;
  onUploadBanner: (file: File) => Promise<UploadResult>;
};

type FieldErrors = Partial<Record<keyof UpdateEventFullPatch, string>>;

type Draft = {
  title: string;
  location: string;
  description: string;
  startsAtLocal: string;
  endsAtLocal: string;
  bannerUrlRaw: string;
  depositEurosRaw: string;
  maxAttendeesRaw: string;
};

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function zodErrorsToFieldErrors(err: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of err.issues) {
    const key = issue.path[0] as keyof UpdateEventFullPatch | undefined;
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

function eventToDraft(event: AdminEventDetailEvent): Draft {
  return {
    title: event.title ?? "",
    location: event.location ?? "",
    description: event.description ?? "",
    startsAtLocal: isoToLocalInput(event.startsAt ?? null),
    endsAtLocal: isoToLocalInput(event.endsAt ?? null),
    bannerUrlRaw: (event.bannerUrlRaw ?? "").trim(),
    depositEurosRaw: centsToEuroInput(event.depositCents ?? 0),
    maxAttendeesRaw:
      event.maxAttendees != null && Number.isFinite(event.maxAttendees)
        ? String(event.maxAttendees)
        : "",
  };
}

function attendeesInputToValue(raw: string): number | null | undefined {
  const trimmed = raw.trim();

  if (!trimmed) return null;

  const n = Number(trimmed);

  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
    return undefined;
  }

  if (n === 0) return null;

  return n;
}

/* ------------------------------------------------------------------ */
/* Panel (FlexPanel + actions + form)                                 */
/* ------------------------------------------------------------------ */

export function EventDetailsPanel({ event, updateError, onConfirm, onUploadBanner }: Props) {
  const [draft, setDraft] = useState<Draft>(() => eventToDraft(event));

  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // live validation mode: when user is about to publish we enforce "publish" candidate
  const [liveMode, setLiveMode] = useState<"draft" | "publish">("draft");

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [localBannerPreview, setLocalBannerPreview] = useState<string | null>(null);
  const [uploadedBannerPreview, setUploadedBannerPreview] = useState<string | null>(null);
  const [forceDefaultPreview, setForceDefaultPreview] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    setDraft(eventToDraft(event));

    setBannerFile(null);
    setUploadedBannerPreview(null);
    setForceDefaultPreview(false);

    if (localBannerPreview) {
      URL.revokeObjectURL(localBannerPreview);
      setLocalBannerPreview(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id, event.bannerUrlRaw, event.updatedAt]);

  useEffect(() => {
    return () => {
      if (localBannerPreview) URL.revokeObjectURL(localBannerPreview);
    };
  }, [localBannerPreview]);

  const startsIso = useMemo(() => localInputToIso(draft.startsAtLocal), [draft.startsAtLocal]);
  const endsIso = useMemo(() => localInputToIso(draft.endsAtLocal), [draft.endsAtLocal]);

  const canSave = Boolean(event.id && draft.title.trim());
  const canPublish = Boolean(startsIso);

  const primaryLabel = event.isPublished ? "Enregistrer" : "Publier";
  const secondaryLabel = event.isPublished ? "Remettre en brouillon" : "Enregistrer le brouillon";

  const isPrimaryDisabled = !canSave || saving || (!event.isPublished && !canPublish);

  const bannerPreviewUrl = useMemo(() => {
    if (localBannerPreview) return localBannerPreview;
    if (uploadedBannerPreview) return uploadedBannerPreview;

    const eff = (event.bannerUrlEffective ?? "").trim();
    if (!eff) return null;

    if (forceDefaultPreview) return withCacheBust(eff, event.updatedAt ?? null);
    return withCacheBust(eff, event.updatedAt ?? null);
  }, [localBannerPreview, uploadedBannerPreview, forceDefaultPreview, event.bannerUrlEffective, event.updatedAt]);

  const hasCustomBannerNow =
    Boolean(draft.bannerUrlRaw.trim()) || Boolean((event.bannerUrlRaw ?? "").trim());

  const isDirty = useMemo(() => {
    if (bannerFile) return true;

    const base = eventToDraft(event);
    const same =
      draft.title.trim() === base.title.trim() &&
      draft.location.trim() === base.location.trim() &&
      draft.description.trim() === base.description.trim() &&
      draft.startsAtLocal === base.startsAtLocal &&
      draft.endsAtLocal === base.endsAtLocal &&
      draft.bannerUrlRaw.trim() === base.bannerUrlRaw.trim() &&
      draft.depositEurosRaw.trim() === base.depositEurosRaw.trim() &&
      draft.maxAttendeesRaw.trim() === base.maxAttendeesRaw.trim();

    return !same;
  }, [draft, event, bannerFile]);

  /* Reset local draft + erreurs + previews */
  function resetLocalChanges() {
    setDraft(eventToDraft(event));

    setSaveError(null);
    setSaveOk(false);
    setFieldErrors({});
    setLiveMode("draft");

    setBannerFile(null);
    setUploadedBannerPreview(null);
    setForceDefaultPreview(false);

    if (localBannerPreview) {
      URL.revokeObjectURL(localBannerPreview);
      setLocalBannerPreview(null);
    }
  }

  /* Build patch from draft + publish state (DIFF patch, what you actually send) */
  function buildPatch(nextIsPublished: boolean): UpdateEventFullPatch {
  const patch: UpdateEventFullPatch = {};

  const nextTitle = draft.title.trim();
  if (nextTitle && nextTitle !== (event.title ?? "")) patch.title = nextTitle;

  const nextLoc = draft.location.trim() || null;
  if ((nextLoc ?? null) !== (event.location ?? null)) patch.location = nextLoc;

  const nextDesc = draft.description.trim() || null;
  if ((nextDesc ?? null) !== (event.description ?? null)) patch.description = nextDesc;

  const nextBannerRaw = draft.bannerUrlRaw.trim() || null;
  const curBannerRaw = (event.bannerUrlRaw ?? "").trim() || null;
  if (nextBannerRaw !== curBannerRaw) patch.bannerUrl = nextBannerRaw;

  if ((startsIso ?? null) !== (event.startsAt ?? null)) patch.startsAt = startsIso ?? null;
  if ((endsIso ?? null) !== (event.endsAt ?? null)) patch.endsAt = endsIso ?? null;

  if (nextIsPublished !== Boolean(event.isPublished)) patch.isPublished = nextIsPublished;

  const cents = euroInputToCents(draft.depositEurosRaw);
  if (cents != null) {
    const curDeposit = Number(event.depositCents ?? 0);
    if (cents !== curDeposit) patch.depositCents = cents;
  }

  const nextMaxAttendees = attendeesInputToValue(draft.maxAttendeesRaw);
  const curMaxAttendees = event.maxAttendees ?? null;

  if (nextMaxAttendees !== undefined && nextMaxAttendees !== curMaxAttendees) {
    patch.maxAttendees = nextMaxAttendees;
  }

  return patch;
}

  /* Build "candidate patch" for LIVE validation (full values, not diff) */
  function buildPatchCandidateFromDraft(nextIsPublished: boolean): UpdateEventFullPatch {
  const s = localInputToIso(draft.startsAtLocal) || null;
  const e = localInputToIso(draft.endsAtLocal) || null;

  const cents = euroInputToCents(draft.depositEurosRaw);
  const maxAttendees = attendeesInputToValue(draft.maxAttendeesRaw);

  return {
    title: draft.title.trim(),
    location: draft.location.trim() || null,
    description: draft.description.trim() || null,
    bannerUrl: draft.bannerUrlRaw.trim() || null,
    startsAt: s,
    endsAt: e,
    isPublished: nextIsPublished,
    depositCents: cents ?? (Number.NaN as unknown as number),
    maxAttendees:
      maxAttendees === undefined
        ? (Number.NaN as unknown as number)
        : maxAttendees,
  };
}

  /* LIVE Zod validation (debounced) */
  useEffect(() => {
    const t = window.setTimeout(() => {
      const candidate = buildPatchCandidateFromDraft(liveMode === "publish");
      const parsed = updateEventFullPatchSchema.safeParse(candidate);

      if (parsed.success) {
        setFieldErrors({});
        return;
      }

      setFieldErrors(zodErrorsToFieldErrors(parsed.error));
    }, 150);

    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, liveMode]);

  /* Banner picker / preview handling */
  function openBannerPicker() {
    if (fileInputRef.current) fileInputRef.current.value = "";
    fileInputRef.current?.click();
  }

  function onBannerPicked(file: File) {
    setForceDefaultPreview(false);
    setBannerFile(file);

    if (localBannerPreview) URL.revokeObjectURL(localBannerPreview);
    setLocalBannerPreview(URL.createObjectURL(file));

    setUploadedBannerPreview(null);

    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function clearBanner() {
    setForceDefaultPreview(true);

    setBannerFile(null);
    setUploadedBannerPreview(null);

    if (localBannerPreview) {
      URL.revokeObjectURL(localBannerPreview);
      setLocalBannerPreview(null);
    }

    setDraft((d) => ({ ...d, bannerUrlRaw: "" }));
  }

  /* Save flow: optional upload + validate + confirm patch */
  async function save(nextIsPublished: boolean) {
  if (!canSave) return;

  setSaving(true);
  setSaveError(null);
  setSaveOk(false);

  try {
    let forcedBannerUrl: string | null | undefined = undefined;

    if (bannerFile) {
      const max = 4 * 1024 * 1024;
      if (bannerFile.size > max) {
        throw new Error(`Bannière trop lourde (${bytesToMb(bannerFile.size)}MB, max 4MB)`);
      }

      const up = await onUploadBanner(bannerFile);

      forcedBannerUrl = up.publicUrl;
      setUploadedBannerPreview(up.publicUrlWithBust);

      setBannerFile(null);
      if (localBannerPreview) {
        URL.revokeObjectURL(localBannerPreview);
        setLocalBannerPreview(null);
      }

      setDraft((d) => ({ ...d, bannerUrlRaw: up.publicUrl }));
      setForceDefaultPreview(false);
    }

    const candidate = buildPatchCandidateFromDraft(nextIsPublished);
    const liveParsed = updateEventFullPatchSchema.safeParse(candidate);

    if (!liveParsed.success) {
      setFieldErrors(zodErrorsToFieldErrors(liveParsed.error));
      setSaving(false);
      return;
    }

    const patch = buildPatch(nextIsPublished);
    if (forcedBannerUrl !== undefined) patch.bannerUrl = forcedBannerUrl;

    if (Object.keys(patch).length === 0) {
      setSaving(false);
      return;
    }

    const parsed = updateEventFullPatchSchema.safeParse(patch);
    if (!parsed.success) {
      setFieldErrors(zodErrorsToFieldErrors(parsed.error));
      setSaving(false);
      return;
    }

    await onConfirm(parsed.data);

    setSaving(false);
    setSaveOk(true);
    setTimeout(() => setSaveOk(false), 1200);

    const wasPublished = Boolean(event.isPublished);
    const isNowPublished = nextIsPublished;

    const toastConfig =
      !wasPublished && isNowPublished
        ? {
            title: "Événement publié",
            description: "L’événement est maintenant visible publiquement.",
          }
        : wasPublished && !isNowPublished
        ? {
            title: "Événement remis en brouillon",
            description: "L’événement n’est plus visible publiquement.",
          }
        : {
            title: "Événement enregistré",
            description: "Les détails de l’événement ont été enregistrés.",
          };

    showToast({
      ...toastConfig,
      variant: "success",
      duration: 3500,
    });
  } catch (e) {
    setSaving(false);
    setSaveError(e instanceof Error ? e.message : "Impossible d’enregistrer l’événement");

    showToast({
      title: "Enregistrement impossible",
      description: "Vérifiez les champs et réessayez.",
      variant: "error",
      duration: 6000,
    });
  }
}

  const subtitle = "Modifiez les informations principales de l’événement.";

  return (
    <FlexPanel
      title="Détails"
      subtitle={subtitle}
      state={isDirty ? "dirty" : "default"}
      actions={
        <>
          <Button
            disabled={!canSave || saving}
            onFocus={() => setLiveMode("draft")}
            onMouseEnter={() => setLiveMode("draft")}
            onClick={() => void save(false)}
            variant="secondary"
          >
            {secondaryLabel}
          </Button>

          <Button
            disabled={isPrimaryDisabled}
            onFocus={() => setLiveMode("publish")}
            onMouseEnter={() => setLiveMode("publish")}
            onClick={() => void save(true)}
          >
            {saving ? "Enregistrement…" : primaryLabel}
          </Button>
        </>
      }
    >
      {updateError ? <MessageBox variant="error">{updateError}</MessageBox> : null}
      {saveError ? <MessageBox variant="error">{saveError}</MessageBox> : null}
      {saveOk ? <MessageBox variant="success">Enregistré</MessageBox> : null}

      <EventDetailsFields
        draft={draft}
        setDraft={setDraft}
        fieldErrors={fieldErrors}
        bannerPreviewUrl={bannerPreviewUrl}
        bannerFile={bannerFile}
        hasCustomBannerNow={hasCustomBannerNow}
        fileInputRef={fileInputRef}
        openBannerPicker={openBannerPicker}
        onBannerPicked={onBannerPicked}
        clearBanner={clearBanner}
      />

      <StickySaveBar
        show={isDirty}
        saving={saving}
        disableSave={!canSave || saving}
        onSave={() => void save(Boolean(event.isPublished))}
        onCancel={resetLocalChanges}
        saveLabel={event.isPublished ? "Enregistrer" : "Enregistrer le brouillon"}
        savingLabel="Enregistrement…"
      />
    </FlexPanel>
  );
}