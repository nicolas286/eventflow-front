import { useEffect, useMemo, useState } from "react";
import {
  updateEventPatchSchema,
  type UpdateEventPatch,
} from "../../../domain/models/admin/admin.updateEventPatch.schema";
import type { AdminEventDetailEvent } from "../../../domain/models/admin/admin.eventDetail.schema";
import { Button, Input } from "../../../ui/components";
import { MessageBox } from "../../../ui/components/message/MessageBox";
import { isoToLocalInput, localDateTimeMinNow, localInputToIso } from "../../../domain/helpers/dateTime";
import { useLiveForm } from "../../public/useLiveZodForm";
import type { EditableEventFields } from "./EventEditor";

type Props = {
  event: Partial<AdminEventDetailEvent>;
  onConfirm: (patch: EditableEventFields) => void;
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

  const live = useLiveForm<UpdateEventPatch>(updateEventPatchSchema, initialDraft);

  useEffect(() => {
    live.reset(initialDraft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDraft, live.reset]);

  const draft = live.form;

  async function submit() {
    setSubmitError(null);
    setSuccessMsg(null);

    live.touchAll(FORM_KEYS);

    const res = live.validateAll();
    if (!res.ok) {
      setSubmitError("Veuillez corriger les champs en erreur.");
      return;
    }

    const parsed = updateEventPatchSchema.parse(res.data);

    const patch = makePatch(parsed, event);
    if (Object.keys(patch).length === 0) {
      setSubmitError("Aucune modification détectée.");
      return;
    }

    try {
      const result = await onConfirm(patch);

      const failed = result === null;

      if (!failed) setSuccessMsg("Modifications enregistrées avec succès.");
      else setSubmitError("Impossible d’enregistrer l’événement.");
    } catch {
      setSubmitError("Impossible d’enregistrer l’événement.");
    }
  }

  const showErr = <K extends keyof UpdateEventPatch>(key: K) =>
    live.shouldShowFieldError(key, { hideUntilTouched: true }) &&
    !!live.fieldErrors[key];

  const minLocal = localDateTimeMinNow();

  return (
    <div className="eventEditor">
      {submitError && <MessageBox variant="error">{submitError}</MessageBox>}
      {successMsg && <MessageBox variant="success">{successMsg}</MessageBox>}

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
        min={minLocal}
        onChange={(e) => live.handleChange("startsAt", localInputToIso(e.target.value))}
        onBlur={() => live.handleBlur("startsAt")}
        label="Date et heure de début"
      />
      {showErr("startsAt") && (
        <div className="eventEditor__error">{live.fieldErrors.startsAt}</div>
      )}

      {/* Select publication sous date/heure */}
      <div className="eventEditor__row1">
        <div className="eventEditor__label">Publication</div>
        <select
          className="eventEditor__select"
          value={draft.isPublished ? "published" : "draft"}
          onChange={(e) => live.handleChange("isPublished", e.target.value === "published")}
          onBlur={() => live.handleBlur("isPublished")}
        >
          <option value="draft">Brouillon</option>
          <option value="published">Publié</option>
        </select>
      </div>

      <div className="eventEditor__footer isLeft">
        <Button label="Enregistrer" variant="primary" onClick={submit} />
      </div>
    </div>
  );
}
