import { useMemo, useState } from "react";
import { z } from "zod";

import {
  updateEventFullPatchSchema,
  type UpdateEventFullPatch,
} from "../../../../domain/models/admin/admin.updateEventFullPatch.schema";
import type { Event } from "../../../../domain/models/db/db.event.schema";

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

type Props = {
  event: Event;
  onConfirm: (patch: UpdateEventFullPatch) => void;
  onSaved?: (nextEvent: Event) => void;
};

type FieldErrors = Partial<Record<keyof UpdateEventFullPatch, string>>;

type Draft = {
  title: string;
  location: string;
  description: string;
  startsAtLocal: string;
  endsAtLocal: string;
  bannerUrl: string;
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

// ISO -> "YYYY-MM-DDTHH:mm" (local)
function isoToLocalInput(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate()
  )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// "YYYY-MM-DDTHH:mm" (local) -> ISO
function localInputToIso(local: string) {
  if (!local) return null;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function eventToDraft(event: Event): Draft {
  return {
    title: event.title ?? "",
    location: event.location ?? "",
    description: event.description ?? "",
    startsAtLocal: isoToLocalInput(event.startsAt ?? null),
    endsAtLocal: isoToLocalInput(event.endsAt ?? null),
    bannerUrl: event.bannerUrl ?? "",
    depositCentsRaw: String((event as any).depositCents ?? 0),
  };
}

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export function EventDetailsForm({ event, onConfirm }: Props) {
  // ⚠️ reset via <EventDetailsForm key={event.id} />
  const [draft, setDraft] = useState<Draft>(() => eventToDraft(event));

  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const startsIso = useMemo(
    () => localInputToIso(draft.startsAtLocal),
    [draft.startsAtLocal]
  );
  const endsIso = useMemo(
    () => localInputToIso(draft.endsAtLocal),
    [draft.endsAtLocal]
  );

  const canSave = Boolean(event.id && draft.title.trim());

  const bannerEffective = useMemo(() => {
    const trimmed = draft.bannerUrl.trim();
    return trimmed ? trimmed : null;
  }, [draft.bannerUrl]);

  /* ------------------------------------------------------------------ */
  /* Patch builder                                                      */
  /* ------------------------------------------------------------------ */

  function buildPatch(nextIsPublished: boolean): UpdateEventFullPatch {
    const patch: UpdateEventFullPatch = {};

    const nextTitle = draft.title.trim();
    if (nextTitle && nextTitle !== (event.title ?? "")) {
      patch.title = nextTitle;
    }

    const nextLoc = draft.location.trim() || null;
    if ((nextLoc ?? null) !== (event.location ?? null)) {
      patch.location = nextLoc;
    }

    const nextDesc = draft.description.trim() || null;
    if ((nextDesc ?? null) !== (event.description ?? null)) {
      patch.description = nextDesc;
    }

    const nextBanner = draft.bannerUrl.trim() || null;
    if ((nextBanner ?? null) !== (event.bannerUrl ?? null)) {
      patch.bannerUrl = nextBanner;
    }

    if ((startsIso ?? null) !== (event.startsAt ?? null)) {
      patch.startsAt = startsIso ?? null;
    }

    if ((endsIso ?? null) !== (event.endsAt ?? null)) {
      patch.endsAt = endsIso ?? null;
    }

    if (nextIsPublished !== Boolean(event.isPublished)) {
      patch.isPublished = nextIsPublished;
    }

    const raw = draft.depositCentsRaw.trim();
    const parsed = raw === "" ? 0 : Number(raw);
    if (!Number.isNaN(parsed)) {
      const nextDeposit = Math.max(0, Math.trunc(parsed));
      const curDeposit = Number((event as any).depositCents ?? 0);
      if (nextDeposit !== curDeposit) {
        patch.depositCents = nextDeposit;
      }
    }

    return patch;
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
      const patch = buildPatch(nextIsPublished);

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

      onConfirm(parsed.data);

      setSaving(false);
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 1200);
    } catch (e) {
      setSaving(false);
      setSaveError(
        e instanceof Error ? e.message : "Impossible d’enregistrer l’événement"
      );
    }
  }

  /* ------------------------------------------------------------------ */
  /* UI labels                                                          */
  /* ------------------------------------------------------------------ */

  const primaryLabel = event.isPublished ? "Enregistrer" : "Publier";
  const secondaryLabel = event.isPublished
    ? "Remettre en brouillon"
    : "Enregistrer le brouillon";

  const canPublish = Boolean(startsIso);
  const isPrimaryDisabled =
    !canSave || saving || (!event.isPublished && !canPublish);

  /* ------------------------------------------------------------------ */
  /* Render                                                             */
  /* ------------------------------------------------------------------ */

  return (
    <div className="adminEventDetails">
      <div className="adminEventHeaderRow">
        <div>
          <h3 style={{ margin: 0 }}>Détails</h3>
          <div className="adminEventHint">
            Modifie les informations principales de l’événement.
          </div>
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
            onChange={(e) =>
              setDraft((d) => ({ ...d, title: e.target.value }))
            }
          />
          {fieldErrors.title && (
            <div className="formError">{fieldErrors.title}</div>
          )}
        </div>

        <div className="adminEventField">
          <div className="adminEventLabel">Lieu</div>
          <input
            className="adminEventInput"
            value={draft.location}
            onChange={(e) =>
              setDraft((d) => ({ ...d, location: e.target.value }))
            }
          />
          {fieldErrors.location && (
            <div className="formError">{fieldErrors.location}</div>
          )}
        </div>

        <div className="adminEventField adminEventFieldSpan2">
          <div className="adminEventLabel">Description</div>
          <textarea
            className="adminEventTextarea"
            value={draft.description}
            onChange={(e) =>
              setDraft((d) => ({ ...d, description: e.target.value }))
            }
          />
          {fieldErrors.description && (
            <div className="formError">{fieldErrors.description}</div>
          )}
        </div>

        <div className="adminEventField">
          <div className="adminEventLabel">Début</div>
          <input
            type="datetime-local"
            className="adminEventInput"
            value={draft.startsAtLocal}
            onChange={(e) =>
              setDraft((d) => ({ ...d, startsAtLocal: e.target.value }))
            }
          />
          {fieldErrors.startsAt && (
            <div className="formError">{fieldErrors.startsAt}</div>
          )}
        </div>

        <div className="adminEventField">
          <div className="adminEventLabel">Fin (optionnel)</div>
          <input
            type="datetime-local"
            className="adminEventInput"
            value={draft.endsAtLocal}
            onChange={(e) =>
              setDraft((d) => ({ ...d, endsAtLocal: e.target.value }))
            }
          />
          {fieldErrors.endsAt && (
            <div className="formError">{fieldErrors.endsAt}</div>
          )}
        </div>

        <div className="adminEventField">
          <div className="adminEventLabel">Acompte (centimes)</div>
          <input
            type="number"
            min={0}
            step={1}
            className="adminEventInput"
            value={draft.depositCentsRaw}
            onChange={(e) =>
              setDraft((d) => ({ ...d, depositCentsRaw: e.target.value }))
            }
          />
          {fieldErrors.depositCents && (
            <div className="formError">{fieldErrors.depositCents}</div>
          )}
          <div className="adminEventHint">0 = pas d’acompte.</div>
        </div>

        <div className="adminEventField adminEventFieldSpan2">
          <div className="adminEventLabel">Bannière (URL)</div>
          <input
            className="adminEventInput"
            value={draft.bannerUrl}
            onChange={(e) =>
              setDraft((d) => ({ ...d, bannerUrl: e.target.value }))
            }
          />
          {fieldErrors.bannerUrl && (
            <div className="formError">{fieldErrors.bannerUrl}</div>
          )}
        </div>

        <div className="adminEventField adminEventFieldSpan2">
          <div className="adminEventLabel">Aperçu bannière</div>
          {bannerEffective ? (
            <img
              className="adminEventBannerPreview"
              src={bannerEffective}
              alt="Bannière"
            />
          ) : (
            <div className="adminEventEmpty">Aucune bannière</div>
          )}
        </div>

        <div
          className="adminEventField adminEventFieldSpan2"
          style={{ marginTop: 12, display: "flex", gap: 8 }}
        >
          <button
            type="button"
            className="adminEventBtn isSecondary"
            disabled={!canSave || saving}
            onClick={() => save(false)}
          >
            {secondaryLabel}
          </button>

          <button
            type="button"
            className="adminEventBtn"
            disabled={isPrimaryDisabled}
            onClick={() => save(true)}
          >
            {saving ? "Enregistrement…" : primaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
