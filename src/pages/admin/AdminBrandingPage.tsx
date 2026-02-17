import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";

import { Container } from "../../ui/components";
import Card, { CardBody, CardHeader } from "../../ui/components/card/Card";

import BrandingPanel from "../../features/admin/brandingPanel/BrandingPanel";
import type { AdminOutletContext } from "../../pages/admin/AdminDashboard";
import { type OrgBrandingUI } from "../../domain/models/admin/admin.orgBranding.schema";

export default function AdminBrandingPage() {
  const { bootstrap, orgId, refetch } = useOutletContext<AdminOutletContext>();
  const orgProfile = bootstrap?.organizationProfile;
  const orgPlan = bootstrap?.organization?.plan;

  const initial = useMemo<OrgBrandingUI>(
    () => ({
      displayName: orgProfile?.displayName ?? "Mon organisation",
      primaryColor: orgProfile?.primaryColor ?? "#2563eb",
      logoUrl: orgProfile?.logoUrl ?? "",
      defaultEventBannerUrl: orgProfile?.defaultEventBannerUrl ?? "",
    }),
    [orgProfile]
  );

  const [branding, setBranding] = useState<OrgBrandingUI>(initial);

  useEffect(() => {
    setBranding(initial);
  }, [initial]);

  return (
    <Container>
      <Card>
        <CardHeader
          title="Apparence"
          subtitle="Contrôlez l'apparence de votre organisation. Les modifications apparaîtront dans vos pages publiques et privées."
        />
        <CardBody>
        <BrandingPanel
        orgId={orgId}
        org={branding}
        setOrg={setBranding}
        onSaved={refetch}
        orgPlan={orgPlan}
      />

        </CardBody>
      </Card>
    </Container>
  );
}
