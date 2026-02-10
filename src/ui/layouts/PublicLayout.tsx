import { Outlet, useParams } from "react-router-dom";
import { supabase } from "../../gateways/supabase/supabaseClient";
import { usePublicOrgData } from "../../features/admin/hooks/usePublicOrgData";
import OrgThemeSync from "../../features/theme/OrgThemeSync";

import "../../styles/desktop/publicLayout.css";

export function PublicLayout() {
  const { orgSlug } = useParams<{ orgSlug: string }>();

  const { profile } = usePublicOrgData({
    supabase,
    orgSlug,
  });

  const primaryHex = profile?.primaryColor ?? "#2563eb";

  return (
    <div className="publicLayoutRoot">
      <OrgThemeSync primaryColor={primaryHex} />
      <main className="publicLayoutMain">
        <Outlet />
      </main>
    </div>
  );
}
