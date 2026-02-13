import { useMemo, useState } from "react";
import { z } from "zod";
import {
  updateEventPatchSchema,
  type UpdateEventPatch,
} from "../../../domain/models/admin/admin.updateEventPatch.schema";
import { Button, Input } from "../../../ui/components";
import type { AdminEventDetailEvent } from "../../../domain/models/admin/admin.eventDetail.schema";
import { isoToLocalInput, localInputToIso } from "../../../domain/helpers/dateTime";

type Props = {
  event: Partial<AdminEventDetailEvent>
  onConfirm: (patch: UpdateEventPatch) => void;
};

type FieldErrors = Partial<Record<keyof UpdateEventPatch, string>>;

function zodErrorsToFieldErrors(err: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of err.issues) {
    const key = issue.path[0] as keyof UpdateEventPatch | undefined;
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

export default function EventEditorForm({ event, onConfirm }: Props) {
  const [draft, setDraft] = useState<UpdateEventPatch>(() => ({
    title: event.title,
    location: event.location ?? null,
    startsAt: event.startsAt ?? null,
    isPublished: event.isPublished,
  }));

  const validation = useMemo(
    () => updateEventPatchSchema.safeParse(draft),
    [draft]
  );

  const fieldErrors: FieldErrors = validation.success
    ? {}
    : zodErrorsToFieldErrors(validation.error);

  const isValid = validation.success;

  function submit(nextIsPublished?: boolean) {
    const parsed = updateEventPatchSchema.parse({
      ...draft,
      ...(typeof nextIsPublished === "boolean"
        ? { isPublished: nextIsPublished }
        : {}),
    });

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

    if (Object.keys(patch).length === 0) return;
    onConfirm(patch);
  }

  const primaryLabel = event.isPublished ? "Enregistrer" : "Publier";
  const primaryNextIsPublished = true;

  const secondaryLabel = event.isPublished
    ? "Remettre en brouillon"
    : "Enregistrer le brouillon";
  const secondaryNextIsPublished = false;

  const canPublish = Boolean(draft.startsAt); // startsAt obligatoire pour publier
  const isPrimaryDisabled =
    !isValid || (!event.isPublished && !canPublish);

  return (
    <div>
      <Input
        value={draft.title ?? ""}
        onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
        placeholder="Nom de l'événement"
        label="Nom de l'événement"
      />
      {fieldErrors.title && <div className="formError">{fieldErrors.title}</div>}

      <Input
        value={draft.location ?? ""}
        onChange={(e) =>
          setDraft((d) => ({ ...d, location: e.target.value || null }))
        }
        placeholder="Lieu de l'événement"
        label="Lieu de l'événement"
      />
      {fieldErrors.location && <div className="formError">{fieldErrors.location}</div>}

      <Input
        type="datetime-local"
        value={isoToLocalInput(draft.startsAt ?? null)}
        onChange={(e) =>
          setDraft((d) => ({
            ...d,
            startsAt: localInputToIso(e.target.value),
          }))
        }
        label="Date et heure de début"
      />
      {fieldErrors.startsAt && <div className="formError">{fieldErrors.startsAt}</div>}

      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <Button
          label={secondaryLabel}
          variant="secondary"
          disabled={!isValid}
          onClick={() => submit(secondaryNextIsPublished)}
        />

        <Button
          label={primaryLabel}
          variant="primary"
          disabled={isPrimaryDisabled}
          onClick={() => submit(primaryNextIsPublished)}
        />
      </div>
    </div>
  );
}
