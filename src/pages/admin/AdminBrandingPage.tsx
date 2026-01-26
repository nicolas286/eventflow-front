import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";

import Container from "../../ui/components/Container/Container";
import Card, { CardBody, CardHeader } from "../../ui/components/card/Card";

import BrandingPanel from "../../features/admin/brandingPanel/BrandingPanel";
import type { AdminOutletContext } from "./AdminDashboard";

type OrgBranding = {
  name: string;
  primaryColor: string;
  logoUrl?: string;
};

export default function AdminBrandingPage() {
  const { org } = useOutletContext<AdminOutletContext>();

  const initial = useMemo<OrgBranding>(
    () => ({
      name: (org?.name as string) ?? "Mon organisation",
      primaryColor: (org as any)?.primaryColor ?? "#2563eb",
      logoUrl: (org as any)?.logoUrl ?? "",
    }),
    [org]
  );

  const [branding, setBranding] = useState<OrgBranding>(initial);

  return (
    <Container>
      <Card>
        <CardHeader title="Branding" subtitle="Nom, couleur, logo" />
        <CardBody>
          <BrandingPanel org={branding} setOrg={setBranding} />
        </CardBody>
      </Card>
    </Container>
  );
}
