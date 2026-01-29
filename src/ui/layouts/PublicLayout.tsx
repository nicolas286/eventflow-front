import { Outlet, useParams } from "react-router-dom";
import { supabase } from "../../gateways/supabase/supabaseClient";
import { usePublicOrgData } from "../../features/admin/hooks/usePublicOrgData";
import OrgThemeSync from "../../features/theme/OrgThemeSync";

export function PublicLayout() {
  const { orgSlug } = useParams<{ orgSlug: string }>();

  const { profile } = usePublicOrgData({
    supabase,
    orgSlug,
  });

  const primaryHex = profile?.primaryColor ?? "#2563eb";

  return (
    <div>
      <OrgThemeSync primaryColor={primaryHex} />
      <Outlet />
    </div>
  );
}
