import { useEffect, useMemo, useState } from "react";

type SupabaseLike = {
  from: (table: string) => {
    update: (values: any) => any;
    eq: (col: string, val: any) => any;
    select: (cols?: string) => any;
    single: () => any;
  };
};

type Props = {
  supabase: SupabaseLike;
  orgId: string;
  event: any;
  orgBranding?: any;
  onSaved?: (nextEvent: any) => void;
};

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

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-");
}

export function EventDetailsForm(props: Props) {
  const { supabase, event, onSaved } = props;

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [startsAtLocal, setStartsAtLocal] = useState("");
  const [endsAtLocal, setEndsAtLocal] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [bannerUrlRaw, setBannerUrlRaw] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);

  useEffect(() => {
    if (!event) return;

    setTitle(event.title ?? "");
    setSlug(event.slug ?? "");
    setLocation(event.location ?? "");
    setDescription(event.description ?? "");
    setStartsAtLocal(isoToLocalInput(event.startsAt));
    setEndsAtLocal(isoToLocalInput(event.endsAt));
    setIsPublished(Boolean(event.isPublished));
    setBannerUrlRaw(event.bannerUrlRaw ?? "");

    setSaveError(null);
    setSaveOk(false);
  }, [event?.id]);

  const startsIso = useMemo(() => localInputToIso(startsAtLocal), [startsAtLocal]);
  const endsIso = useMemo(() => localInputToIso(endsAtLocal), [endsAtLocal]);

  const dateError = useMemo(() => {
    if (!startsIso || !endsIso) return null;
    if (new Date(startsIso).getTime() > new Date(endsIso).getTime()) {
      return "La date de début ne peut pas être après la date de fin.";
    }
    return null;
  }, [startsIso, endsIso]);

  const canSave = Boolean(event?.id && title.trim() && slug.trim() && !dateError);

  async function save() {
    if (!canSave) return;

    setSaving(true);
    setSaveError(null);

    const payload = {
      title: title.trim(),
      slug: slug.trim(),
      description: description.trim() || null,
      location: location.trim() || null,
      starts_at: startsIso,
      ends_at: endsIso,
      is_published: isPublished,
      banner_url_raw: bannerUrlRaw.trim() || null,
    };

    const { data, error } = await supabase
      .from("events")
      .update(payload)
      .eq("id", event.id)
      .select("*")
      .single();

    if (error) {
      setSaveError(error.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    setSaveOk(true);
    onSaved?.(data);
    setTimeout(() => setSaveOk(false), 1200);
  }

  function onBlurSlug() {
    setSlug(slugify(slug));
  }

  function generateSlugFromTitle() {
    const next = slugify(title);
    if (next) setSlug(next);
  }

  const bannerEffective =
    event?.bannerUrlEffective || (bannerUrlRaw ? bannerUrlRaw : null);

  return (
    <div className="adminEventDetails">
      <div className="adminEventHeaderRow">
        <div>
          <h3 style={{ margin: 0 }}>Détails</h3>
          <div className="adminEventHint">
            Modifie les informations principales de l’événement.
          </div>
        </div>

        <button
          type="button"
          className="adminEventBtn"
          onClick={save}
          disabled={!canSave || saving}
        >
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>

      {saveError && <div className="adminEventAlert isError">{saveError}</div>}
      {dateError && <div className="adminEventAlert isWarn">{dateError}</div>}
      {saveOk && <div className="adminEventAlert isOk">Enregistré</div>}

      <div className="adminEventFormGrid">
        <div className="adminEventField">
          <div className="adminEventLabel">Titre</div>
          <input
            className="adminEventInput"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="adminEventField">
          <div className="adminEventLabel">Slug</div>
          <input
            className="adminEventInput"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            onBlur={onBlurSlug}
            spellCheck={false}
          />
          <button
            type="button"
            className="adminEventInlineBtn"
            onClick={generateSlugFromTitle}
            disabled={!title.trim()}
          >
            Générer depuis le titre
          </button>
          <div className="adminEventHint">URL publique : /o/…/e/{slug || "…"}</div>
        </div>

        <div className="adminEventField">
          <div className="adminEventLabel">Lieu</div>
          <input
            className="adminEventInput"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>

        <div className="adminEventField adminEventFieldSpan2">
          <div className="adminEventLabel">Description</div>
          <textarea
            className="adminEventTextarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="adminEventField">
          <div className="adminEventLabel">Début</div>
          <input
            type="datetime-local"
            className="adminEventInput"
            value={startsAtLocal}
            onChange={(e) => setStartsAtLocal(e.target.value)}
          />
        </div>

        <div className="adminEventField">
          <div className="adminEventLabel">Fin</div>
          <input
            type="datetime-local"
            className="adminEventInput"
            value={endsAtLocal}
            onChange={(e) => setEndsAtLocal(e.target.value)}
          />
        </div>

        <div className="adminEventField">
          <div className="adminEventLabel">Statut</div>
          <label className="adminEventToggle">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
            />
            <span>{isPublished ? "Publié" : "Brouillon"}</span>
          </label>
        </div>

        <div className="adminEventField">
          <div className="adminEventLabel">Bannière (URL)</div>
          <input
            className="adminEventInput"
            value={bannerUrlRaw}
            onChange={(e) => setBannerUrlRaw(e.target.value)}
          />
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
      </div>
    </div>
  );
}
