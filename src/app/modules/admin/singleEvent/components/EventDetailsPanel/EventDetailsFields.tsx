import type { RefObject, Dispatch, SetStateAction } from "react";

import { Button, Input } from "@ui/components";
import { localDateTimeMinNow } from "@helpers/dateTime";

import type { UpdateEventFullPatch } from "../../schemas/admin.updateEventFullPatch.schema";

type FieldErrors = Partial<Record<keyof UpdateEventFullPatch, string>>;

export type EventDetailsDraft = {
  title: string;
  location: string;
  description: string;
  startsAtLocal: string;
  endsAtLocal: string;
  bannerUrlRaw: string;
  depositEurosRaw: string;
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
          {fieldErrors.title ? <div className="formError">{fieldErrors.title}</div> : null}
        </div>

        <div className="adminEventField">
          <div className="adminEventLabel">Lieu</div>
          <input
            className="adminEventInput"
            value={draft.location}
            onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))}
          />
          {fieldErrors.location ? <div className="formError">{fieldErrors.location}</div> : null}
        </div>

        <div className="adminEventField adminEventFieldSpan2">
          <div className="adminEventLabel">Description</div>
          <textarea
            className="adminEventTextarea"
            value={draft.description}
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
          />
          {fieldErrors.description ? <div className="formError">{fieldErrors.description}</div> : null}
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
          {fieldErrors.startsAt ? <div className="formError">{fieldErrors.startsAt}</div> : null}
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

            {hasCustomBannerNow || bannerFile ? <Button variant="secondary" onClick={clearBanner}>Retirer</Button> : null}
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
          {fieldErrors.endsAt ? <div className="formError">{fieldErrors.endsAt}</div> : null}
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
          {fieldErrors.depositCents ? <div className="formError">{fieldErrors.depositCents}</div> : null}
          <div className="adminEventHint">0 = pas d’acompte.</div>
        </div>
      </div>
    </div>
  );
}