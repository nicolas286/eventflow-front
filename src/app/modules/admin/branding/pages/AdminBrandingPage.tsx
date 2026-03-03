import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";

import { Container } from "../../../../../shared/ui/components";
import Card, { CardBody, CardHeader } from "../../../../../shared/ui/components/card/Card";

import BrandingPanel from "../components/BrandingPanel";
import type { AdminOutletContext } from "../../dashboard/components/AdminDashboard";
import { type OrgBrandingUI } from "../schemas/admin.orgBranding.schema";

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
