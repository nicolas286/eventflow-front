import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";

import {
  updateEventFullPatchSchema,
  type UpdateEventFullPatch,
} from "../../../../domain/models/admin/admin.updateEventFullPatch.schema";

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

type UploadResult = {
  path: string;
  publicUrl: string; // valeur DB (raw)
  publicUrlWithBust: string; // valeur UI (cache-bust)
};

export type AdminEventDetailEvent = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string | null;
  endsAt: string | null;
  isPublished: boolean;

  bannerUrlRaw: string | null;          // e.banner_url
  bannerUrlEffective: string;           // coalesce(raw, orgDefault, globalDefault) => NON NULL
  depositCents?: number | null;

  updatedAt?: string | null;            // string timestamp
};

type Props = {
  event: AdminEventDetailEvent;

  onConfirm: (patch: UpdateEventFullPatch) => Promise<void>;
  onUploadBanner: (file: File) => Promise<UploadResult>;

  onSaved?: (nextEvent: AdminEventDetailEvent) => void;
};

type FieldErrors = Partial<Record<keyof UpdateEventFullPatch, string>>;

type Draft = {
  title: string;
  location: string;
  description: string;
  startsAtLocal: string;
  endsAtLocal: string;

  // RAW uniquement (DB: events.banner_url)
  bannerUrlRaw: string;

  depositCentsRaw: string;
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
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
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

function eventToDraft(event: AdminEventDetailEvent): Draft {
  return {
    title: event.title ?? "",
    location: event.location ?? "",
    description: event.description ?? "",
    startsAtLocal: isoToLocalInput(event.startsAt ?? null),
    endsAtLocal: isoToLocalInput(event.endsAt ?? null),
    bannerUrlRaw: (event.bannerUrlRaw ?? "").trim(),
    depositCentsRaw: String(event.depositCents ?? 0),
  };
}

function withBust(url: string, seed?: string | null) {
  const u = (url ?? "").trim();
  if (!u) return u;

  // seed stable (updatedAt) si dispo, sinon Date.now (dernier recours)
  const v = seed ? Date.parse(seed) || Date.now() : Date.now();
  const sep = u.includes("?") ? "&" : "?";
  return `${u}${sep}v=${v}`;
}

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export function EventDetailsForm({ event, onConfirm, onUploadBanner }: Props) {
  const [draft, setDraft] = useState<Draft>(() => eventToDraft(event));

  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // Banner state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [localBannerPreview, setLocalBannerPreview] = useState<string | null>(null);
  const [uploadedBannerPreview, setUploadedBannerPreview] = useState<string | null>(null);

  // ✅ pour “Retirer”: on force l’aperçu à montrer le default immédiatement
  const [forceDefaultPreview, setForceDefaultPreview] = useState(false);

  // resync draft quand l’event change
  useEffect(() => {
    setDraft(eventToDraft(event));

    // reset états “transitoires”
    setBannerFile(null);
    setUploadedBannerPreview(null);
    setForceDefaultPreview(false);

    if (localBannerPreview) {
      URL.revokeObjectURL(localBannerPreview);
      setLocalBannerPreview(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id, event.bannerUrlRaw, event.updatedAt]);

  // cleanup blob
  useEffect(() => {
    return () => {
      if (localBannerPreview) URL.revokeObjectURL(localBannerPreview);
    };
  }, [localBannerPreview]);

  const startsIso = useMemo(() => localInputToIso(draft.startsAtLocal), [draft.startsAtLocal]);
  const endsIso = useMemo(() => localInputToIso(draft.endsAtLocal), [draft.endsAtLocal]);

  const canSave = Boolean(event.id && draft.title.trim());

  // ✅ Aperçu bannière (UX instant)
  const bannerPreviewUrl = useMemo(() => {
    // 1) fichier local choisi => preview immédiate
    if (localBannerPreview) return localBannerPreview;

    // 2) juste uploadé => bust immédiat (contourne cache)
    if (uploadedBannerPreview) return uploadedBannerPreview;

    // 3) retirer => on force l’effective (default) (bust avec updatedAt)
    if (forceDefaultPreview) {
      const eff = (event.bannerUrlEffective ?? "").trim();
      return eff ? withBust(eff, event.updatedAt ?? null) : null;
    }

    // 4) sinon, l’effective (bust avec updatedAt pour éviter Ctrl+F5)
    const eff = (event.bannerUrlEffective ?? "").trim();
    return eff ? withBust(eff, event.updatedAt ?? null) : null;
  }, [
    localBannerPreview,
    uploadedBannerPreview,
    forceDefaultPreview,
    event.bannerUrlEffective,
    event.updatedAt,
  ]);

  /* ------------------------------------------------------------------ */
  /* Patch builder                                                      */
  /* ------------------------------------------------------------------ */

  function buildPatch(nextIsPublished: boolean): UpdateEventFullPatch {
    const patch: UpdateEventFullPatch = {};

    const nextTitle = draft.title.trim();
    if (nextTitle && nextTitle !== (event.title ?? "")) patch.title = nextTitle;

    const nextLoc = draft.location.trim() || null;
    if ((nextLoc ?? null) !== (event.location ?? null)) patch.location = nextLoc;

    const nextDesc = draft.description.trim() || null;
    if ((nextDesc ?? null) !== (event.description ?? null)) patch.description = nextDesc;

    // banner raw (DB)
    const nextBannerRaw = draft.bannerUrlRaw.trim() || null;
    const curBannerRaw = (event.bannerUrlRaw ?? "").trim() || null;
    if (nextBannerRaw !== curBannerRaw) patch.bannerUrl = nextBannerRaw;

    if ((startsIso ?? null) !== (event.startsAt ?? null)) patch.startsAt = startsIso ?? null;
    if ((endsIso ?? null) !== (event.endsAt ?? null)) patch.endsAt = endsIso ?? null;

    if (nextIsPublished !== Boolean(event.isPublished)) patch.isPublished = nextIsPublished;

    const raw = draft.depositCentsRaw.trim();
    const parsed = raw === "" ? 0 : Number(raw);
    if (!Number.isNaN(parsed)) {
      const nextDeposit = Math.max(0, Math.trunc(parsed));
      const curDeposit = Number(event.depositCents ?? 0);
      if (nextDeposit !== curDeposit) patch.depositCents = nextDeposit;
    }

    return patch;
  }

  /* ------------------------------------------------------------------ */
  /* Banner actions                                                     */
  /* ------------------------------------------------------------------ */

  function openBannerPicker() {
    // ne pas toucher aux previews si cancel
    if (fileInputRef.current) fileInputRef.current.value = "";
    fileInputRef.current?.click();
  }

  function onBannerPicked(file: File) {
    setForceDefaultPreview(false); // on sort du mode “retirer”
    setBannerFile(file);

    // preview locale immédiate
    if (localBannerPreview) URL.revokeObjectURL(localBannerPreview);
    setLocalBannerPreview(URL.createObjectURL(file));

    // on masque l’upload précédent
    setUploadedBannerPreview(null);

    // re-choisir le même fichier possible
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function clearBanner() {
    // ✅ visuellement: default immédiat
    setForceDefaultPreview(true);

    // état upload/local reset
    setBannerFile(null);
    setUploadedBannerPreview(null);

    if (localBannerPreview) {
      URL.revokeObjectURL(localBannerPreview);
      setLocalBannerPreview(null);
    }

    // ✅ raw vide => patch builder enverra bannerUrl = null
    setDraft((d) => ({ ...d, bannerUrlRaw: "" }));
  }

  /* ------------------------------------------------------------------ */
  /* Save                                                              */
  /* ------------------------------------------------------------------ */

  async function save(nextIsPublished: boolean) {
    if (!canSave) return;

    setSaving(true);
    setSaveError(null);
    setSaveOk(false);
    setFieldErrors({});

    try {
      let forcedBannerUrl: string | null | undefined = undefined;

      // 1) upload éventuel
      if (bannerFile) {
        const max = 4 * 1024 * 1024;
        if (bannerFile.size > max) {
          throw new Error(`Bannière trop lourde (${bytesToMb(bannerFile.size)}MB, max 4MB)`);
        }

        const up = await onUploadBanner(bannerFile);

        forcedBannerUrl = up.publicUrl;
        setUploadedBannerPreview(up.publicUrlWithBust);

        // consume + cleanup local preview
        setBannerFile(null);
        if (localBannerPreview) {
          URL.revokeObjectURL(localBannerPreview);
          setLocalBannerPreview(null);
        }

        // sync draft raw
        setDraft((d) => ({ ...d, bannerUrlRaw: up.publicUrl }));
        setForceDefaultPreview(false);
      }

      // 2) patch
      const patch = buildPatch(nextIsPublished);

      // 3) upload => forcer bannerUrl (même si même path)
      if (forcedBannerUrl !== undefined) {
        patch.bannerUrl = forcedBannerUrl;
      }

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

  /* ------------------------------------------------------------------ */
  /* UI labels                                                          */
  /* ------------------------------------------------------------------ */

  const primaryLabel = event.isPublished ? "Enregistrer" : "Publier";
  const secondaryLabel = event.isPublished ? "Remettre en brouillon" : "Enregistrer le brouillon";

  const canPublish = Boolean(startsIso);
  const isPrimaryDisabled = !canSave || saving || (!event.isPublished && !canPublish);

  const hasCustomBannerNow =
    Boolean(draft.bannerUrlRaw.trim()) || Boolean((event.bannerUrlRaw ?? "").trim());

  /* ------------------------------------------------------------------ */
  /* Render                                                             */
  /* ------------------------------------------------------------------ */

  return (
    <div className="adminEventDetails">
      <div className="adminEventHeaderRow">
        <div>
          <h3 style={{ margin: 0 }}>Détails</h3>
          <div className="adminEventHint">Modifie les informations principales de l’événement.</div>
        </div>
      </div>

      {saveError && <div className="adminEventAlert isError">{saveError}</div>}
      {saveOk && <div className="adminEventAlert isOk">Enregistré</div>}

      <div className="adminEventFormGrid">
        <div className="adminEventField">
          <div className="adminEventLabel">Titre</div>
          <input
            className="adminEventInput"
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          />
          {fieldErrors.title && <div className="formError">{fieldErrors.title}</div>}
        </div>

        <div className="adminEventField">
          <div className="adminEventLabel">Lieu</div>
          <input
            className="adminEventInput"
            value={draft.location}
            onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))}
          />
          {fieldErrors.location && <div className="formError">{fieldErrors.location}</div>}
        </div>

        <div className="adminEventField adminEventFieldSpan2">
          <div className="adminEventLabel">Description</div>
          <textarea
            className="adminEventTextarea"
            value={draft.description}
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
          />
          {fieldErrors.description && <div className="formError">{fieldErrors.description}</div>}
        </div>

        <div className="adminEventField">
          <div className="adminEventLabel">Début</div>
          <input
            type="datetime-local"
            className="adminEventInput"
            value={draft.startsAtLocal}
            onChange={(e) => setDraft((d) => ({ ...d, startsAtLocal: e.target.value }))}
          />
          {fieldErrors.startsAt && <div className="formError">{fieldErrors.startsAt}</div>}
        </div>

        <div className="adminEventField">
          <div className="adminEventLabel">Fin (optionnel)</div>
          <input
            type="datetime-local"
            className="adminEventInput"
            value={draft.endsAtLocal}
            onChange={(e) => setDraft((d) => ({ ...d, endsAtLocal: e.target.value }))}
          />
          {fieldErrors.endsAt && <div className="formError">{fieldErrors.endsAt}</div>}
        </div>

        <div className="adminEventField">
          <div className="adminEventLabel">Acompte (centimes)</div>
          <input
            type="number"
            min={0}
            step={1}
            className="adminEventInput"
            value={draft.depositCentsRaw}
            onChange={(e) => setDraft((d) => ({ ...d, depositCentsRaw: e.target.value }))}
          />
          {fieldErrors.depositCents && <div className="formError">{fieldErrors.depositCents}</div>}
          <div className="adminEventHint">0 = pas d’acompte.</div>
        </div>

        {/* Bannière */}
        <div className="adminEventField adminEventFieldSpan2">
          <div className="adminEventLabel">Bannière</div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button type="button" className="adminEventBtn isSecondary" onClick={openBannerPicker}>
              {hasCustomBannerNow || bannerFile ? "Remplacer" : "Choisir un fichier"}
            </button>

            {(hasCustomBannerNow || bannerFile) ? (
              <button type="button" className="adminEventBtn isSecondary" onClick={clearBanner}>
                Retirer
              </button>
            ) : null}

            {bannerFile ? (
              <div className="adminEventHint" style={{ margin: 0 }}>
                Fichier prêt : <strong>{bannerFile.name}</strong>
              </div>
            ) : null}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              onBannerPicked(file);
            }}
          />

          <div className="adminEventHint">
            Recommandé: large (ex: 1600×600) · max 4MB · l’upload se fait au moment de “Enregistrer”.
          </div>
        </div>

        <div className="adminEventField adminEventFieldSpan2">
          <div className="adminEventLabel">Aperçu bannière</div>
          {bannerPreviewUrl ? (
            <img className="adminEventBannerPreview" src={bannerPreviewUrl} alt="Bannière" />
          ) : (
            <div className="adminEventEmpty">Aucune bannière</div>
          )}
        </div>

        {/* Actions */}
        <div
          className="adminEventField adminEventFieldSpan2"
          style={{ marginTop: 12, display: "flex", gap: 8 }}
        >
          <button
            type="button"
            className="adminEventBtn isSecondary"
            disabled={!canSave || saving}
            onClick={() => void save(false)}
          >
            {secondaryLabel}
          </button>

          <button
            type="button"
            className="adminEventBtn"
            disabled={isPrimaryDisabled}
            onClick={() => void save(true)}
          >
            {saving ? "Enregistrement…" : primaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
