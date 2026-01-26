import { Outlet } from "react-router-dom";
import "../../styles/adminDashBoard.css";

import TopNav from "../../ui/components/navigation/TopNav";
import { supabase } from "../../gateways/supabase/supabaseClient";
import {useAdminDashboardData} from "../../features/admin/hooks/useAdminDashboardData";

export type AdminOutletContext = {
  org: { name?: string; logoUrl?: string } | null;
  orgId: string;
  bootstrap: any;
  events: any[];
};

export default function AdminDashboard() {
  const { loading, error, bootstrap, orgId, events } = useAdminDashboardData({ supabase });

  const org = bootstrap
    ? { ...(bootstrap.organizationProfile ?? {}), ...(bootstrap.organization ?? {}) }
    : null;

  if (loading) {
    return (
      <div className="adminPage">
        <TopNav mode="admin" org={org ?? undefined} />
        <div className="adminPageGrid">
          <div className="adminPageRight">Chargement…</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="adminPage">
        <TopNav mode="admin" org={org ?? undefined} />
        <div className="adminPageGrid">
          <div className="adminPageRight">Erreur : {String(error)}</div>
        </div>
      </div>
    );
  }

  if (!orgId) {
    return (
      <div className="adminPage">
        <TopNav mode="admin" org={org ?? undefined} />
        <div className="adminPageGrid">
          <div className="adminPageRight">
            <h2>Bienvenue 👋</h2>
            <p>Vous n’avez pas encore d’organisation. Créez-en une pour commencer.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="adminPage">
      {/* ✅ Le hamburger est dans TopNav -> visible partout */}
      <TopNav mode="admin" org={org ?? undefined} />

      <div className="adminPageGrid">
        <div className="adminPageRight">
          <Outlet context={{ org, orgId, bootstrap, events } satisfies AdminOutletContext} />
        </div>
      </div>
    </div>
  );
}
