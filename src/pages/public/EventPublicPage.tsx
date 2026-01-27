import { useParams, Link } from "react-router-dom";
import { supabase } from "../../gateways/supabase/supabaseClient";
import { usePublicEventDetail } from "../../features/admin/hooks/usePublicEventDetail";

export function EventPublicPage() {
  const { orgSlug, eventSlug } = useParams<{ orgSlug: string; eventSlug: string }>();

  const { loading, error, data } = usePublicEventDetail({
    supabase,
    orgSlug,
    eventSlug,
  });

  /**
   * ✅ Structure des données dispo dans la page :
   *
   * data: {
   *   org: {
   *     slug: string
   *     logoUrl: string (resolved)
   *     defaultEventBannerUrl: string (resolved)
   *   }
   *
   *   event: {
   *     id: string (uuid)
   *     slug: string
   *     title: string
   *     description: string | null
   *     location: string | null
   *     bannerUrl: string (resolved)
   *     startsAt: string | null (ISO)
   *     endsAt: string | null (ISO)
   *   }
   *
   *   products: Array<{
   *     id: string (uuid)
   *     name: string
   *     description: string | null
   *     priceCents: number
   *     currency: string
   *     stockQty: number | null
   *     createsAttendees: boolean
   *     attendeesPerUnit: number
   *     sortOrder: number
   *   }>
   *
   *   formFields: Array<{
   *     id: string (uuid)
   *     label: string
   *     fieldKey: string
   *     fieldType: string
   *     isRequired: boolean
   *     options: any
   *     sortOrder: number
   *   }>
   * }
   */

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Chargement…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Erreur : {error}</div>
      </div>
    );
  }

  if (!data?.event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Événement introuvable.</div>
      </div>
    );
  }

  const { org, event, products, formFields } = data;

  return (
    <div className="min-h-screen">
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {org?.logoUrl ? (
              <img
                src={org.logoUrl}
                alt={org.slug}
                className="h-10 w-10 rounded object-cover"
              />
            ) : null}

            <div>
              <h1 className="text-2xl font-semibold">{event.title}</h1>
              <div className="text-sm opacity-70">
                slug: {event.slug}
                {event.location ? ` · ${event.location}` : ""}
              </div>
            </div>
          </div>

          {orgSlug ? (
            <Link to={`/o/${orgSlug}`} className="underline underline-offset-2">
              Retour orga
            </Link>
          ) : null}
        </div>

        {event.bannerUrl ? (
          <img
            src={event.bannerUrl}
            alt={event.title}
            className="mt-6 w-full rounded-lg object-cover"
          />
        ) : null}

        {event.startsAt ? (
          <div className="mt-4 text-sm opacity-70">
            startsAt: {event.startsAt}
            {event.endsAt ? ` · endsAt: ${event.endsAt}` : ""}
          </div>
        ) : null}

        {event.description ? (
          <p className="mt-4 whitespace-pre-wrap">{event.description}</p>
        ) : null}

        <div className="mt-10">
          <h2 className="text-lg font-semibold">Produits</h2>

          {products.length === 0 ? (
            <div className="mt-2 opacity-70">Aucun produit actif.</div>
          ) : (
            <ul className="mt-3 space-y-3">
              {products.map((p) => (
                <li key={p.id} className="border rounded p-3">
                  <div className="font-medium">
                    {p.name} — {p.priceCents} {p.currency}
                  </div>
                  {p.description ? (
                    <div className="text-sm opacity-70 mt-1">{p.description}</div>
                  ) : null}
                  <div className="text-sm opacity-70 mt-1">
                    stockQty: {p.stockQty ?? "∞"} · attendeesPerUnit: {p.attendeesPerUnit}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-10">
          <h2 className="text-lg font-semibold">Champs du formulaire</h2>

          {formFields.length === 0 ? (
            <div className="mt-2 opacity-70">Aucun champ actif.</div>
          ) : (
            <ul className="mt-3 space-y-2">
              {formFields.map((f) => (
                <li key={f.id} className="border rounded p-3">
                  <div className="font-medium">
                    {f.label}{" "}
                    {f.isRequired ? <span className="opacity-70">(requis)</span> : null}
                  </div>
                  <div className="text-sm opacity-70">
                    key: {f.fieldKey} · type: {f.fieldType}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Debug optionnel */}
        {/* <pre className="mt-8 text-xs opacity-70 overflow-auto">
          {JSON.stringify(data, null, 2)}
        </pre> */}
      </div>
    </div>
  );
}
