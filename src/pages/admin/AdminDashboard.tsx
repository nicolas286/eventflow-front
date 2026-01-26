import { Outlet } from "react-router-dom";
import "../../styles/adminDashBoard.css";

import TopNav, { type OrgInfo } from "../../ui/components/navigation/TopNav";
import { supabase } from "../../gateways/supabase/supabaseClient";
import { useAdminDashboardData } from "../../features/admin/hooks/useAdminDashboardData";

import type { EventOverviewRow } from "../../domain/models/eventOverviewRow.schema";
import type { DashboardBootstrap } from "../../domain/models/dashboardBootstrap.schema";


export type AdminOutletContext = {
  org: OrgInfo | null;
  orgId: string;
  bootstrap: DashboardBootstrap;
  events: EventOverviewRow[];
};


export default function AdminDashboard() {
  const { loading, error, bootstrap, orgId, events } = useAdminDashboardData({ supabase });

    const topNavOrg: OrgInfo | null = bootstrap
  ? {
      name: bootstrap.organizationProfile?.displayName ?? bootstrap.organization?.name,
      logoUrl: bootstrap.organizationProfile?.logoUrl ?? undefined,
    }
  : null;

  if (loading) {
    return (
      <div className="adminPage">
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
  // Mais on évite les crashs si hook renvoie temporairement null.
  if (!bootstrap) {
    return (
      <div className="adminPage">
        <TopNav mode="admin" org={topNavOrg} />
        <div className="adminPageGrid">
          <div className="adminPageRight">Chargement…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="adminPage">
      <TopNav mode="admin" org={topNavOrg} />

      <div className="adminPageGrid">
        <div className="adminPageRight">
          <Outlet context={{ org: topNavOrg, orgId, bootstrap, events } satisfies AdminOutletContext} />
        </div>
      </div>
    </div>
  );
}
