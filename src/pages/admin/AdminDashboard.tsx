import { Outlet } from "react-router-dom";
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

  // ✅ Couleur orga -> thème global (html/body) via composant
  const primaryHex = bootstrap?.organizationProfile?.primaryColor ?? "#2563eb";

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

  if (!orgId) {
    return (
      <div className="adminPage">
        <OrgThemeSync primaryColor={primaryHex} />
        <TopNav mode="admin" org={topNavOrg} />
        <div className="adminPageGrid">
          <div className="adminPageRight">
            <h2>Bienvenue 👋</h2>
            <p>Vous n’avez pas encore d’organisation. Créez-en une pour commencer.</p>
          </div>
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
