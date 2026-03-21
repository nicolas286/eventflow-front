import type { RefObject, Dispatch, SetStateAction } from "react";

import { Button, Input } from "@ui/components";
import { localDateTimeMinNow } from "@helpers/dateTime";

import type { UpdateEventFullPatch } from "../../schemas/admin.updateEventFullPatch.schema";
import { TextareaWithToolbar } from "@shared/ui/components/inputs/TextAreaWithToolbar";
import { MessageBox } from "@shared/ui/components/message/MessageBox";

type FieldErrors = Partial<Record<keyof UpdateEventFullPatch, string>>;

export type EventDetailsDraft = {
  title: string;
  location: string;
  description: string;
  startsAtLocal: string;
  endsAtLocal: string;
  bannerUrlRaw: string;
  depositEurosRaw: string;
  maxAttendeesRaw: string;
};

type Props = {
  draft: EventDetailsDraft;
  setDraft: Dispatch<SetStateAction<EventDetailsDraft>>;
  fieldErrors: FieldErrors;

  bannerPreviewUrl: string | null;
  bannerFile: File | null;
  hasCustomBannerNow: boolean;

  fileInputRef: RefObject<HTMLInputElement | null>;
  openBannerPicker: () => void;
  onBannerPicked: (file: File) => void;
  clearBanner: () => void;
};

export function EventDetailsFields(props: Props) {
  const {
    draft,
    setDraft,
    fieldErrors,
    bannerPreviewUrl,
    bannerFile,
    hasCustomBannerNow,
    fileInputRef,
    openBannerPicker,
    onBannerPicked,
    clearBanner,
  } = props;

  return (
    <div className="adminEventDetails">
      <div className="adminEventFormGrid">
        <div className="adminEventField">
          <div className="adminEventLabel">Titre</div>
          <input
            className="adminEventInput"
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          />
          {fieldErrors.title ? <MessageBox variant="error">{fieldErrors.title}</MessageBox> : null}
        </div>

        <div className="adminEventField">
          <div className="adminEventLabel">Lieu</div>
          <input
            className="adminEventInput"
            value={draft.location}
            onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))}
          />
          {fieldErrors.location ? <MessageBox variant="error">{fieldErrors.location}</MessageBox> : null}
        </div>

        <div className="adminEventField adminEventFieldSpan2">
          <TextareaWithToolbar
            label="Description"
            value={draft.description}
            onChange={(next) => setDraft((d) => ({ ...d, description: next }))}
            error={fieldErrors.description ?? null}
            textAreaClassName="adminEventTextarea"
            rows={6}
            hint="Markdown : **gras**, _italique_, ~~barré~~."
          />
        </div>

        <div className="adminEventField adminEventLeftCol">
          <div className="adminEventLabel">Début</div>
          <input
            type="datetime-local"
            className="adminEventInput"
            min={localDateTimeMinNow()}
            value={draft.startsAtLocal}
            onChange={(e) => setDraft((d) => ({ ...d, startsAtLocal: e.target.value }))}
          />
          {fieldErrors.startsAt ? <MessageBox variant="error">{fieldErrors.startsAt}</MessageBox> : null}
        </div>

        <div className="adminEventField adminEventBannerSide">
          <div className="adminEventLabel">Bannière</div>

          {bannerPreviewUrl ? (
            <img className="adminEventBannerPreviewMini" src={bannerPreviewUrl} alt="Bannière" />
          ) : (
            <div className="adminEventEmpty">Aucune bannière</div>
          )}

          <div className="adminEventBannerActionsBelow">
            <Button variant="secondary" onClick={openBannerPicker}>
              {hasCustomBannerNow || bannerFile ? "Remplacer" : "Choisir un fichier"}
            </Button>

            {hasCustomBannerNow || bannerFile ? (
              <Button variant="secondary" onClick={clearBanner}>
                Retirer
              </Button>
            ) : null}
          </div>

          {bannerFile ? (
            <div className="adminEventHint" style={{ margin: 0 }}>
              Fichier prêt : <strong>{bannerFile.name}</strong>
            </div>
          ) : null}

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
        </div>

        <div className="adminEventField adminEventLeftCol">
          <div className="adminEventLabel">Fin (optionnel)</div>
          <input
            type="datetime-local"
            min={localDateTimeMinNow()}
            className="adminEventInput"
            value={draft.endsAtLocal}
            onChange={(e) => setDraft((d) => ({ ...d, endsAtLocal: e.target.value }))}
          />
          {fieldErrors.endsAt ? <MessageBox variant="error">{fieldErrors.endsAt}</MessageBox> : null}
        </div>

        <div className="adminEventField adminEventLeftCol">
          <div className="adminEventLabel">Acompte (€)</div>
          <Input
            format="price"
            priceLocale="fr"
            placeholder="0,00"
            value={draft.depositEurosRaw}
            onValueChange={(v) => {
              if (v.kind === "priceDraft") {
                setDraft((d) => ({ ...d, depositEurosRaw: v.raw }));
                return;
              }
              if (v.kind === "priceCommit") {
                const formatted = (v.cents / 100).toFixed(2).replace(".", ",");
                setDraft((d) => ({ ...d, depositEurosRaw: formatted }));
                return;
              }
            }}
          />
          {fieldErrors.depositCents ? <MessageBox variant="error">{fieldErrors.depositCents}</MessageBox> : null}
          <div className="adminEventHint">0 = pas d’acompte.</div>
        </div>

        <div className="adminEventField adminEventLeftCol">
          <div className="adminEventLabel">Participants max</div>
          <input
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            className="adminEventInput"
            placeholder="0"
            value={draft.maxAttendeesRaw}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                maxAttendeesRaw: e.target.value,
              }))
            }
          />
          {fieldErrors.maxAttendees ? (
            <MessageBox variant="error">{fieldErrors.maxAttendees}</MessageBox>
          ) : null}
          <div className="adminEventHint">0 = participants non limités.</div>
        </div>
      </div>
    </div>
  );
}