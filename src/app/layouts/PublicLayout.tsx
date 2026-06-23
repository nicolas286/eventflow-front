import { Outlet, useParams } from "react-router-dom";
import { supabase } from "@shared/gateways/supabase/supabaseClient";
import { usePublicOrgData } from "@modules/public/organization/hooks/usePublicOrgData";
import OrgThemeSync from "@shared/ui/components/theme/OrgThemeSync";

import "./PublicLayout.css";

export function PublicLayout() {
  const { orgSlug } = useParams<{ orgSlug: string }>();

  const publicOrgData = usePublicOrgData({
    supabase,
    orgSlug,
  });

  const primaryHex = publicOrgData.profile?.primaryColor ?? "#eb9225";

  return (
    <div className="publicLayoutRoot">
      <OrgThemeSync primaryColor={primaryHex} />
      <main className="publicLayoutMain">
        <Outlet context={publicOrgData} />
      </main>
    </div>
  );
}