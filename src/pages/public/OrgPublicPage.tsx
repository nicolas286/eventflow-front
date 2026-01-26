import { useParams, Link } from "react-router-dom";
import { supabase } from "../../gateways/supabase/supabaseClient";
import { usePublicOrgData } from "../../features/admin/hooks/usePublicOrgData";

export function OrgPublicPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();

  const { loading, error, org, profile, events } = usePublicOrgData({
    supabase,
    orgSlug,
  });

  /**
   * ✅ Structure des données dispo dans la page :
   *
   * org: {
   *   id: string (uuid)
   *   type: "association" | "person"
   *   name: string
   * }
   *
   * profile: {
   *   slug: string
   *   displayName: string | null
   *   description: string | null
   *   publicEmail: string | null
   *   phone: string | null
   *   website: string | null
   *   logoUrl: string | null
   *   primaryColor: string | null
   *   defaultEventBannerUrl: string | null
   * }
   *
   * events: Array<{
   *   id: string (uuid)
   *   slug: string
   *   title: string
   *   description?: string | null
   *   bannerUrl?: string | null
   *   startsAt?: string | null (ISO)
   *   endsAt?: string | null (ISO)
   * }>
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

  // Si pas d'erreur mais org/profile null (normalement rare),
  // on évite un crash.
  if (!org || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Organisation introuvable.</div>
      </div>
    );
  }

  const displayName = profile.displayName ?? org.name;

  return (
    <div className="min-h-screen">
      {/* Pour l’instant on “hydrate” juste, donc affichage minimal */}
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center gap-3">
          {profile.logoUrl ? (
            <img
              src={profile.logoUrl}
              alt={displayName}
              className="h-12 w-12 rounded object-cover"
            />
          ) : null}

          <div>
            <h1 className="text-2xl font-semibold">{displayName}</h1>
            <div className="text-sm opacity-70">
              slug: {profile.slug} · type: {org.type}
            </div>
          </div>
        </div>

        {profile.description ? (
          <p className="mt-4 whitespace-pre-wrap">{profile.description}</p>
        ) : null}

        <div className="mt-8">
          <h2 className="text-lg font-semibold">Événements</h2>

          {events.length === 0 ? (
            <div className="mt-2 opacity-70">Aucun événement publié.</div>
          ) : (
            <ul className="mt-3 space-y-3">
              {events.map((e) => (
                <li key={e.id} className="border rounded p-3">
                  <div className="font-medium">{e.title}</div>

                  {e.startsAt ? (
                    <div className="text-sm opacity-70">
                      startsAt: {e.startsAt}
                      {e.endsAt ? ` · endsAt: ${e.endsAt}` : ""}
                    </div>
                  ) : null}

                  {/* route: /o/:orgSlug/e/:eventSlug */}
                  <div className="mt-2">
                    <Link
                      to={`e/${e.slug}`}
                      className="underline underline-offset-2"
                    >
                      Voir l’événement
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Debug léger optionnel (tu peux enlever) */}
        {/* <pre className="mt-8 text-xs opacity-70 overflow-auto">
          {JSON.stringify({ org, profile, events }, null, 2)}
        </pre> */}
      </div>
    </div>
  );
}
