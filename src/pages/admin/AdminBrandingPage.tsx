// AdminBrandingPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";

import { Container } from "../../ui/components";
import Card, { CardBody, CardHeader } from "../../ui/components/card/Card";

import BrandingPanel from "../../features/admin/brandingPanel/BrandingPanel";
import type { AdminOutletContext } from "../../pages/admin/AdminDashboard";

type OrgBranding = {
  name: string;
  primaryColor: string;
  logoUrl?: string;
  defaultEventBannerUrl?: string;
};

export default function AdminBrandingPage() {
  const { bootstrap, orgId, refetch } = useOutletContext<AdminOutletContext>();
  const orgProfile = bootstrap?.organizationProfile;

  const initial = useMemo<OrgBranding>(
    () => ({
      name: orgProfile?.displayName ?? "Mon organisation",
      primaryColor: orgProfile?.primaryColor ?? "#2563eb",
      logoUrl: orgProfile?.logoUrl ?? "",
      defaultEventBannerUrl: orgProfile?.defaultEventBannerUrl ?? "",
    }),
    [orgProfile]
  );

  const [branding, setBranding] = useState<OrgBranding>(initial);

  // 🔁 resync si le bootstrap arrive après le premier render
  useEffect(() => {
    setBranding(initial);
  }, [initial]);

  return (
    <Container>
      <Card>
        <CardHeader
          title="Branding"
          subtitle="Nom, couleur principale, logo et bannière par défaut"
        />
        <CardBody>
        <BrandingPanel
        orgId={orgId}
        org={branding}
        setOrg={setBranding}
        onSaved={refetch}
      />

        </CardBody>
      </Card>
    </Container>
  );
}
