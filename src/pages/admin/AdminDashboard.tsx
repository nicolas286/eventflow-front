import { Outlet, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import "../../styles/adminDashBoard.css";

import TopNav, { type OrgInfo } from "../../ui/components/navigation/TopNav";
import { supabase } from "../../gateways/supabase/supabaseClient";
import { useAdminDashboardData } from "../../features/admin/hooks/useAdminDashboardData";

import OrgThemeSync from "../../features/theme/OrgThemeSync";

import type { EventOverviewRow } from "../../domain/models/admin/admin.eventsOverview.schema";
import type { DashboardBootstrap } from "../../domain/models/admin/admin.dashboardBootstrap.schema";

export type AdminOutletContext = {
  org: OrgInfo | null;
  orgId: string;
  bootstrap: DashboardBootstrap;
  events: EventOverviewRow[];
  refetch: () => Promise<void>;
};

export default function AdminDashboard() {
  const navigate = useNavigate();

  const { loading, error, bootstrap, orgId, events, refetch } =
    useAdminDashboardData({ supabase });

  const topNavOrg: OrgInfo | null = bootstrap
    ? {
        name:
          bootstrap.organizationProfile?.displayName ??
          bootstrap.organization?.name,
        logoUrl: bootstrap.organizationProfile?.logoUrl ?? undefined,
      }
    : null;

  const primaryHex = bootstrap?.organizationProfile?.primaryColor ?? "#2563eb";

  useEffect(() => {
    if (loading || error) return;
    if (!bootstrap) return;

    const hasOrg = Boolean(bootstrap.organization);
    if (!hasOrg) {
      // ⚠️ évite boucle si on est déjà sur le wizard
      navigate("/admin/onboarding", { replace: true });
    }
  }, [loading, error, bootstrap, navigate]);

  if (loading) {
    return (
      <div className="adminPage">
        <OrgThemeSync primaryColor={primaryHex} />
        <TopNav mode="admin" org={topNavOrg} />
        <div className="adminPageGrid">
          <div className="adminPageRight">Chargement…</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="adminPage">
        <OrgThemeSync primaryColor={primaryHex} />
        <TopNav mode="admin" org={topNavOrg} />
        <div className="adminPageGrid">
          <div className="adminPageRight">Erreur : {String(error)}</div>
        </div>
      </div>
    );
  }

  /**
   * ✅ Ici, orgId peut être vide si pas d'orga.
   * Avec le redirect au-dessus, on ne devrait plus rester sur cet écran,
   * mais on garde un fallback safe (évite flash / cas edge).
   */
  if (!orgId) {
    return (
      <div className="adminPage">
        <OrgThemeSync primaryColor={primaryHex} />
        <TopNav mode="admin" org={topNavOrg} />
        <div className="adminPageGrid">
          <div className="adminPageRight">Redirection…</div>
        </div>
      </div>
    );
  }

  // Sécurité runtime : si orgId existe, bootstrap devrait exister.
  if (!bootstrap) {
    return (
      <div className="adminPage">
        <OrgThemeSync primaryColor={primaryHex} />
        <TopNav mode="admin" org={topNavOrg} />
        <div className="adminPageGrid">
          <div className="adminPageRight">Chargement…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="adminPage">
      <OrgThemeSync primaryColor={primaryHex} />
      <TopNav mode="admin" org={topNavOrg} />
      <div className="adminPageGrid">
        <div className="adminPageRight">
          <Outlet
            context={{
              org: topNavOrg,
              orgId,
              bootstrap,
              events,
              refetch,
            } satisfies AdminOutletContext}
          />
        </div>
      </div>
    </div>
  );
}
