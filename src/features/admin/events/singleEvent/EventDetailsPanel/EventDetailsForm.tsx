import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";

import {
  updateEventFullPatchSchema,
  type UpdateEventFullPatch,
} from "../../../../../domain/models/admin/admin.updateEventFullPatch.schema";

import { Button,StickySaveBar } from "../../../../../ui/components";
import { FlexPanel } from "../../../../../ui/components/panels/FlexPanel";
import { EventDetailsFields } from "./EventDetailsFields";

import type { AdminEventDetailEvent } from "../../../../../domain/models/admin/admin.eventDetail.schema";

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

function isoToLocalInput(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

function localInputToIso(local: string) {
  if (!local) return null;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function bytesToMb(bytes: number) {
  return Math.round((bytes / (1024 * 1024)) * 10) / 10;
}

function centsToEuroInput(cents: number) {
  const v = Number.isFinite(cents) ? cents / 100 : 0;
  return v.toFixed(2).replace(".", ",");
}

function euroInputToCents(raw: string) {
  const t = String(raw ?? "").trim();
  if (!t) return 0;
  const normalized = t.replace(",", ".");
  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.round(n * 100));
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
  };
}

function withBust(url: string, seed?: string | null) {
  const u = (url ?? "").trim();
  if (!u) return u;
  const v = seed ? Date.parse(seed) || Date.now() : Date.now();
  const sep = u.includes("?") ? "&" : "?";
  return `${u}${sep}v=${v}`;
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

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [localBannerPreview, setLocalBannerPreview] = useState<string | null>(null);
  const [uploadedBannerPreview, setUploadedBannerPreview] = useState<string | null>(null);
  const [forceDefaultPreview, setForceDefaultPreview] = useState(false);

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

    if (forceDefaultPreview) return withBust(eff, event.updatedAt ?? null);
    return withBust(eff, event.updatedAt ?? null);
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
      draft.depositEurosRaw.trim() === base.depositEurosRaw.trim();

    return !same;
  }, [draft, event, bannerFile]);

  /* Reset local draft + erreurs + previews */
  function resetLocalChanges() {
    setDraft(eventToDraft(event));

    setSaveError(null);
    setSaveOk(false);
    setFieldErrors({});

    setBannerFile(null);
    setUploadedBannerPreview(null);
    setForceDefaultPreview(false);

    if (localBannerPreview) {
      URL.revokeObjectURL(localBannerPreview);
      setLocalBannerPreview(null);
    }
  }

  /* Build patch from draft + publish state */
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

    return patch;
  }

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
    setFieldErrors({});

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
    } catch (e) {
      setSaving(false);
      setSaveError(e instanceof Error ? e.message : "Impossible d’enregistrer l’événement");
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
          <Button disabled={!canSave || saving} onClick={() => void save(false)}>
            {secondaryLabel}
          </Button>

          <Button disabled={isPrimaryDisabled} onClick={() => void save(true)}>
            {saving ? "Enregistrement…" : primaryLabel}
          </Button>
        </>
      }
    >
      {updateError ? <p style={{ color: "crimson", margin: 0 }}>{updateError}</p> : null}
      {saveError ? <div className="adminEventAlert isError">{saveError}</div> : null}
      {saveOk ? <div className="adminEventAlert isOk">Enregistré</div> : null}

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
        title="Modifications non sauvegardées"
        hint="Enregistre pour appliquer tes changements."
        onSave={() => void save(Boolean(event.isPublished))}
        onCancel={resetLocalChanges}
        saveLabel={event.isPublished ? "Enregistrer" : "Enregistrer le brouillon"}
        savingLabel="Enregistrement…"
      />
    </FlexPanel>
  );
}