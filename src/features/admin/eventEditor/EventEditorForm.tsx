import { useEffect, useMemo, useState } from "react";
import {
  updateEventPatchSchema,
  type UpdateEventPatch,
} from "../../../domain/models/admin/admin.updateEventPatch.schema";
import type { AdminEventDetailEvent } from "../../../domain/models/admin/admin.eventDetail.schema";
import { Button, Input } from "../../../ui/components";
import { MessageBox } from "../../../ui/components/message/MessageBox";
import { isoToLocalInput, localInputToIso } from "../../../domain/helpers/dateTime";
import { useLiveForm } from "../../public/useLiveZodForm";

type Props = {
  event: Partial<AdminEventDetailEvent>;
  onConfirm: (patch: UpdateEventPatch) => Promise<Event | null>;
};

const FORM_KEYS: Array<keyof UpdateEventPatch> = [
  "title",
  "location",
  "startsAt",
  "isPublished",
];

function buildInitialDraft(event: Partial<AdminEventDetailEvent>): UpdateEventPatch {
  return {
    title: event.title,
    location: event.location ?? null,
    startsAt: event.startsAt ?? null,
    isPublished: event.isPublished,
  };
}

function makePatch(parsed: UpdateEventPatch, event: Partial<AdminEventDetailEvent>) {
  const patch: UpdateEventPatch = {};

  if (parsed.title !== event.title) patch.title = parsed.title;

  if ((parsed.location ?? null) !== (event.location ?? null)) {
    patch.location = parsed.location ?? null;
  }

  if ((parsed.startsAt ?? null) !== (event.startsAt ?? null)) {
    patch.startsAt = parsed.startsAt ?? null;
  }

  if (parsed.isPublished !== event.isPublished) {
    patch.isPublished = parsed.isPublished;
  }

  return patch;
}

export default function EventEditorForm({ event, onConfirm }: Props) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const initialDraft = useMemo(() => buildInitialDraft(event), [event]);

  const live = useLiveForm<UpdateEventPatch>(
    updateEventPatchSchema,
    initialDraft
  );

  useEffect(() => {
    live.reset(initialDraft);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDraft, live.reset]);

  const draft = live.form;

  const primaryLabel = event.isPublished ? "Enregistrer" : "Publier";
  const primaryNextIsPublished = true;

  const secondaryLabel = event.isPublished
    ? "Remettre en brouillon"
    : "Enregistrer le brouillon";
  const secondaryNextIsPublished = false;

  async function submit(nextIsPublished: boolean) {
    setSubmitError(null);
    setSuccessMsg(null);

    live.touchAll(FORM_KEYS);

    const res = live.validateAll();
    if (!res.ok) {
      setSubmitError("Veuillez corriger les champs en erreur.");
      return;
    }

    const parsed = updateEventPatchSchema.parse({
      ...res.data,
      isPublished: nextIsPublished,
    });

    const patch = makePatch(parsed, event);
    if (Object.keys(patch).length === 0) {
      setSubmitError("Aucune modification détectée.");
      return;
    }

    const updated = await onConfirm(patch);
      if (updated) setSuccessMsg("Modifications enregistrées avec succès.");
      else setSubmitError("Impossible d’enregistrer l’événement.");
  }

  const showErr = <K extends keyof UpdateEventPatch>(key: K) =>
    live.shouldShowFieldError(key, { hideUntilTouched: true }) &&
    !!live.fieldErrors[key];

  return (
    <div>

      {submitError && (
        <MessageBox variant="error">
          {submitError}
        </MessageBox>
      )}

      {successMsg && (
        <MessageBox variant="success">
          {successMsg}
        </MessageBox>
      )}

      <Input
        value={draft.title ?? ""}
        onChange={(e) => live.handleChange("title", e.target.value)}
        onBlur={() => live.handleBlur("title")}
        placeholder="Nom de l'événement"
        label="Nom de l'événement"
      />
      {showErr("title") && (
        <MessageBox variant="error">{live.fieldErrors.title}</MessageBox>
      )}

      <Input
        value={draft.location ?? ""}
        onChange={(e) => live.handleChange("location", e.target.value || null)}
        onBlur={() => live.handleBlur("location")}
        placeholder="Lieu de l'événement"
        label="Lieu de l'événement"
      />
      {showErr("location") && (
        <MessageBox variant="error">{live.fieldErrors.location}</MessageBox>
      )}

      <Input
        type="datetime-local"
        value={isoToLocalInput(draft.startsAt ?? null)}
        onChange={(e) =>
          live.handleChange("startsAt", localInputToIso(e.target.value))
        }
        onBlur={() => live.handleBlur("startsAt")}
        label="Date et heure de début"
      />
      {showErr("startsAt") && (
        <div className="formError">{live.fieldErrors.startsAt}</div>
      )}

      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <Button
          label={secondaryLabel}
          variant="secondary"
          onClick={() => submit(secondaryNextIsPublished)}
        />

        <Button
          label={primaryLabel}
          variant="primary"
          onClick={() => submit(primaryNextIsPublished)}
        />
      </div>
    </div>
  );
}
