import { useEffect, useMemo, useState } from "react";
import "../../../styles/eventEditor.css";

import { Button, Input } from "../../../ui/components";
import { isoToLocalInput, localInputToIso } from "../../../domain/helpers/dateTime";
import type { EventOverviewRow } from "../../../domain/models/admin/admin.eventsOverview.schema";

type EditableEventFields = Partial<
  Pick<EventOverviewRow["event"], "title" | "isPublished" | "startsAt" | "endsAt">
> & { location?: string | null };

type Props = {
  event: EventOverviewRow["event"] & { location?: string | null };
  onConfirm: (patch: EditableEventFields) => void;
};

export default function EventEditorForm({ event, onConfirm }: Props) {
  const initialDraft = useMemo(
    () => ({
      title: String((event as any).title ?? ""),
      location: String((event as any).location ?? ""),
      startsAt: isoToLocalInput((event as any).startsAt),
      endsAt: isoToLocalInput((event as any).endsAt),
      isPublished: !!(event as any).isPublished,
    }),
    [event]
  );

  const [draft, setDraft] = useState(initialDraft);

  useEffect(() => {
    setDraft(initialDraft);
  }, [initialDraft]);

  const startDate = draft.startsAt ? new Date(draft.startsAt) : null;
  const endDate = draft.endsAt ? new Date(draft.endsAt) : null;

  const isDateInvalid =
    startDate !== null &&
    endDate !== null &&
    startDate.getTime() > endDate.getTime();

  const isDirty =
    draft.title !== initialDraft.title ||
    draft.location !== initialDraft.location ||
    draft.startsAt !== initialDraft.startsAt ||
    draft.endsAt !== initialDraft.endsAt ||
    draft.isPublished !== initialDraft.isPublished;

  const canSubmit = isDirty && !isDateInvalid;

  const submit = () => {
    if (!canSubmit) return;

    const patch: EditableEventFields = {};

    if (draft.title !== initialDraft.title) patch.title = draft.title;
    if (draft.location !== initialDraft.location) patch.location = draft.location;
    if (draft.isPublished !== initialDraft.isPublished) patch.isPublished = draft.isPublished;

    if (draft.startsAt !== initialDraft.startsAt) {
      const iso = localInputToIso(draft.startsAt);
      if (iso) patch.startsAt = iso as any;
    }

    if (draft.endsAt !== initialDraft.endsAt) {
      const iso = localInputToIso(draft.endsAt);
      if (iso) patch.endsAt = iso as any;
    }

    onConfirm(patch);
  };

  return (
    <div className="eventEditor">
      <div className="eventEditor__row2">
        <Input
          label="Titre"
          value={draft.title}
          onChange={(e) => setDraft((s) => ({ ...s, title: e.target.value }))}
        />
        <Input
          label="Lieu"
          value={draft.location}
          onChange={(e) => setDraft((s) => ({ ...s, location: e.target.value }))}
        />
      </div>

      <div className="eventEditor__row2">
        <div>
          <div className="eventEditor__label">Début</div>
          <input
            className={`eventEditor__datetime ${isDateInvalid ? "isError" : ""}`}
            type="datetime-local"
            value={draft.startsAt}
            onChange={(e) => setDraft((s) => ({ ...s, startsAt: e.target.value }))}
          />
        </div>

        <div>
          <div className="eventEditor__label">Fin</div>
          <input
            className={`eventEditor__datetime ${isDateInvalid ? "isError" : ""}`}
            type="datetime-local"
            value={draft.endsAt}
            onChange={(e) => setDraft((s) => ({ ...s, endsAt: e.target.value }))}
          />
        </div>
      </div>

      {isDateInvalid && (
        <div className="eventEditor__error">
          La date de fin doit être postérieure à la date de début.
        </div>
      )}

      <div className="eventEditor__row1">
        <div>
          <div className="eventEditor__label">Publication</div>
          <select
            className="eventEditor__select"
            value={draft.isPublished ? "published" : "draft"}
            onChange={(e) =>
              setDraft((s) => ({ ...s, isPublished: e.target.value === "published" }))
            }
          >
            <option value="draft">Brouillon</option>
            <option value="published">Publié</option>
          </select>
        </div>
      </div>

      <div className="eventEditor__footer">
        <Button
          variant="secondary"
          label="Réinitialiser"
          disabled={!isDirty}
          onClick={() => setDraft(initialDraft)}
        />
        <Button
          label="Confirmer"
          disabled={!canSubmit}
          onClick={submit}
        />
      </div>
    </div>
  );
}
