import { useMemo, useState } from "react";
import { z } from "zod";
import {
  updateEventPatchSchema,
  type UpdateEventPatch,
} from "../../../domain/models/admin/admin.updateEventPatch.schema";
import { Button, Input } from "../../../ui/components";

type Props = {
  event: {
    id: string;
    title: string;
    location?: string | null;
    startsAt?: string | null; // ISO
    endsAt?: string | null;   // ISO
    isPublished: boolean;
  };
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

// ISO -> "YYYY-MM-DDTHH:mm" (local) pour datetime-local
function isoToLocalInputValue(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

// "YYYY-MM-DDTHH:mm" (local) -> ISO (UTC instant)
function localInputValueToIso(v: string) {
  if (!v) return null;
  const d = new Date(v); // interprété comme local
  if (!Number.isFinite(d.getTime())) return null;
  return d.toISOString();
}

export default function EventEditorForm({ event, onConfirm }: Props) {
  const [draft, setDraft] = useState<UpdateEventPatch>(() => ({
    title: event.title,
    location: event.location ?? null,
    startsAt: event.startsAt ?? null,
    endsAt: event.endsAt ?? null,
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

  function submit() {
    const parsed = updateEventPatchSchema.parse(draft);

    const patch: UpdateEventPatch = {};
    if (parsed.title !== event.title) patch.title = parsed.title;
    if ((parsed.location ?? null) !== (event.location ?? null))
      patch.location = parsed.location ?? null;
    if ((parsed.startsAt ?? null) !== (event.startsAt ?? null))
      patch.startsAt = parsed.startsAt ?? null;
    if (parsed.isPublished !== event.isPublished)
      patch.isPublished = parsed.isPublished;

    if (Object.keys(patch).length === 0) return;
    onConfirm(patch);
  }

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
        value={isoToLocalInputValue(draft.startsAt ?? null)}
        onChange={(e) =>
          setDraft((d) => ({
            ...d,
            startsAt: localInputValueToIso(e.target.value),
          }))
        }
        label="Date et heure de début"
      />
      {fieldErrors.startsAt && <div className="formError">{fieldErrors.startsAt}</div>}

      <div style={{ marginTop: 12 }}>
        <Button label="Enregistrer" onClick={submit} disabled={!isValid} />
      </div>
    </div>
  );
}
