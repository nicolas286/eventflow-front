// pages/admin/AdminProfilPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";

import { Container } from "../../ui/components";
import Card, { CardBody, CardHeader } from "../../ui/components/card/Card";

import ProfilePanel from "../../features/admin/profilePanel/ProfilePanel";
import type { AdminOutletContext } from "../../pages/admin/AdminDashboard";

import { adminProfileFormSchema, type AdminProfileForm } from "../../domain/models/admin/admin.updateAdminProfile.schema";

export default function AdminProfilPage() {
  const { bootstrap, refetch } = useOutletContext<AdminOutletContext>();
  const p = bootstrap?.profile ?? null;

  const initial = useMemo<AdminProfileForm>(() => {
    // ✅ si pas encore chargé, on retourne un “vide” typé (évite any + crash)
    if (!p) {
      return adminProfileFormSchema.parse({
        userId: "",
        firstName: null,
        lastName: null,
        phone: null,
        addressLine1: null,
        addressLine2: null,
        postalCode: null,
        city: null,
        country: null,
        countryCode: null,
      });
    }

    // ✅ on mappe depuis bootstrap.profile
    return adminProfileFormSchema.parse({
      userId: p.userId,
      firstName: p.firstName ?? null,
      lastName: p.lastName ?? null,
      phone: p.phone ?? null,
      addressLine1: p.addressLine1 ?? null,
      addressLine2: p.addressLine2 ?? null,
      postalCode: p.postalCode ?? null,
      city: p.city ?? null,
      country: p.country ?? null,
      countryCode: p.countryCode ?? null,
    });
  }, [p]);

  const [profile, setProfile] = useState<AdminProfileForm>(initial);

  // 🔁 resync si bootstrap arrive après le premier render
  useEffect(() => {
    setProfile(initial);
  }, [initial]);

  // ✅ UX: on attend que bootstrap soit là pour afficher le panel
  if (!bootstrap || !p) {
    return (
      <Container>
        <Card>
          <CardHeader
            title="Profil"
            subtitle="Chargement de vos informations…"
          />
          <CardBody>
            <div style={{ padding: 8, color: "#6b7280", fontSize: 14 }}>
              Patiente une seconde.
            </div>
          </CardBody>
        </Card>
      </Container>
    );
  }

  return (
    <Container>
      <Card>
        <CardHeader
          title="Profil"
          subtitle="Gérez vos informations privées. Elles ne sont visibles que dans l'espace admin."
        />
        <CardBody>
          <ProfilePanel profile={profile} setProfile={setProfile} onSaved={refetch} />
        </CardBody>
      </Card>
    </Container>
  );
}
