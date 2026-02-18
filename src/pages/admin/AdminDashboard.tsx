import { Outlet, useLocation, Navigate } from "react-router-dom";
import "../../styles/desktop/adminDashBoard.desktop.css";
import "../../styles/mobile/adminDashBoard.mobile.css";

import TopNav, { type OrgInfo } from "../../ui/components/navigation/TopNav";
import { supabase } from "../../gateways/supabase/supabaseClient";
import { useAdminDashboardData } from "../../features/admin/hooks/useAdminDashboardData";

import OrgThemeSync from "../../features/theme/OrgThemeSync";

import type { EventOverviewRow } from "../../domain/models/admin/admin.eventsOverview.schema";
import type { DashboardBootstrap } from "../../domain/models/admin/admin.dashboardBootstrap.schema";

export type AdminOutletContext = {
  org: OrgInfo | null;
  orgId: string; // on garde string, mais on passera "" pour onboarding
  bootstrap: DashboardBootstrap;
  events: EventOverviewRow[];
  refetch: () => Promise<void>;
};

export default function AdminDashboard() {
  const location = useLocation();
  const isOnboarding = location.pathname.startsWith("/admin/onboarding");

  const { loading, error, bootstrap, orgId, events, refetch } =
    useAdminDashboardData({ supabase });

  const topNavOrg: OrgInfo | null = bootstrap
    ? {
        name:
          bootstrap.organizationProfile?.displayName ??
          bootstrap.organization?.name,
        logoUrl: bootstrap.organizationProfile?.logoUrl ?? undefined,
        slug: bootstrap.organizationProfile?.slug ?? undefined,
      }
    : null;

  const primaryHex = bootstrap?.organizationProfile?.primaryColor ?? "#2563eb";

  if (loading && !bootstrap) {
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
        {!isOnboarding && <TopNav mode="admin" org={topNavOrg} />}

        <div className="adminPageGrid">
          <div className="adminPageRight">Erreur : {String(error)}</div>
        </div>
      </div>
    );
  }

  // ✅ bootstrap devrait exister ici (sinon on garde un fallback safe)
  if (!bootstrap) {
    return (
      <div className="adminPage">
        <OrgThemeSync primaryColor={primaryHex} />
        {!isOnboarding && <TopNav mode="admin" org={topNavOrg} />}

        <div className="adminPageGrid">
          <div className="adminPageRight">Chargement…</div>
        </div>
      </div>
    );
  }

  // ✅ Pas d'orga => on autorise uniquement /admin/onboarding à s'afficher
  if (!orgId && !isOnboarding) {
      return <Navigate to="/admin/onboarding" replace />;
  }

  return (
    <div className="adminPage">
      <OrgThemeSync primaryColor={primaryHex} />
      {!isOnboarding && <TopNav mode="admin" org={topNavOrg} />}

      <div className="adminPageGrid">
        <div className="adminPageRight">
          <Outlet
            context={{
              org: topNavOrg,
              orgId: orgId ?? "", // ✅ onboarding: "" (pas utilisé)
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
