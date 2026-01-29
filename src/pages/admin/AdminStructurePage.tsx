import { useMemo } from "react";
import { useOutletContext } from "react-router-dom";

import { Container } from "../../ui/components";
import Card, { CardBody, CardHeader } from "../../ui/components/card/Card";

import StructurePanel, {
  type OrgStructure,
} from "../../features/admin/structurePanel/StructurePanel";
import type { AdminOutletContext } from "../../pages/admin/AdminDashboard";

function buildOrgStructure(bootstrap: AdminOutletContext["bootstrap"]): OrgStructure {
  const org = bootstrap?.organization;
  const profile = bootstrap?.organizationProfile;

  return {
    type: (org?.type ?? "association") as OrgStructure["type"],
    name: org?.name ?? "Mon organisation",
    status: (org?.status === "suspended" ? "suspended" : "active") as OrgStructure["status"],

    description: profile?.description ?? null,
    publicEmail: profile?.publicEmail ?? null,
    phone: profile?.phone ?? null,
    website: profile?.website ?? null,

    slug: profile?.slug ?? "",
    paymentsStatus: (org?.paymentsStatus ?? "not_connected") as OrgStructure["paymentsStatus"],
    paymentsLiveReady: !!org?.paymentsLiveReady,
  };
}

export default function AdminStructurePage() {
  const { bootstrap, orgId, refetch } = useOutletContext<AdminOutletContext>();

  const ready = !!bootstrap && !!orgId;

  const orgStructure = useMemo<OrgStructure | null>(() => {
    if (!ready) return null;
    return buildOrgStructure(bootstrap);
  }, [ready, bootstrap]);

  return (
    <Container>
      <Card>
        <CardHeader
          title="Structure"
          subtitle="Gérez l’identité, les infos publiques, et connectez Mollie pour les paiements."
        />
        <CardBody>
          {!ready || !orgStructure ? (
            <div className="adminCard">
              <p>Chargement…</p>
            </div>
          ) : (
            <StructurePanel orgId={orgId} org={orgStructure} onSaved={refetch} />

          )}
        </CardBody>
      </Card>
    </Container>
  );
}
