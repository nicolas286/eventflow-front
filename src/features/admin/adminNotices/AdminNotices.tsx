import type { DashboardBootstrap } from "../../../domain/models/admin/admin.dashboardBootstrap.schema";
import { Notice, type NoticeProps } from "./Notice";
import { isBlank } from "../../../domain/helpers/fields";

type Props = {
  bootstrap: DashboardBootstrap;
  className?: string;
};


export function AdminNotices({ bootstrap, className }: Props) {
  const notices: NoticeProps[] = [];

  const plan = bootstrap.organization?.plan ?? "free";
  const paymentsStatus = bootstrap.organization?.paymentsStatus ?? "not_connected";

  if (plan === "free") {
    notices.push({
      key: "plan-free",
      title: "Plan Free",
      body: "Certaines options sont limitées (branding, etc.). Passez en Starter/Pro pour débloquer.",
      to: "/admin/abonnement",
      cta: "Voir les plans",
    });
  }

  const p = bootstrap.profile;
  const addressMissing =
    isBlank(p.addressLine1) ||
    isBlank(p.postalCode) ||
    isBlank(p.city) ||
    isBlank(p.country) ||
    isBlank(p.countryCode);

    if (addressMissing) {
      notices.push({
        key: "profile-address",
        title: "Profil incomplet",
        body: "Ajoutez votre adresse à votre profil.",
        to: "/admin/profil",
        cta: "Compléter mon profil",
      });
    }

    const op = bootstrap.organizationProfile;
    const orgDescriptionMissing = !op || isBlank(op.description);

    if (orgDescriptionMissing) {
      notices.push({
        key: "org-description",
        title: "Structure à compléter",
        body: "Ajoutez une description de votre organisation, visible sur votre page publique.",
        to: "/admin/structure",
        cta: "Compléter la structure",
      });
    }

    if (paymentsStatus !== "connected") {
      notices.push({
        key: "mollie",
        title: "Paiements non configurés",
        body:
          paymentsStatus === "pending"
            ? "Mollie est en attente de validation. Terminez la configuration pour activer les paiements."
            : "Connectez Mollie pour pouvoir encaisser en ligne.",
        to: "/admin/structure",
        cta: "Configurer Mollie",
      });
    }

    if (notices.length === 0) return null;

    return (
      <div className={["adminNotices", className].filter(Boolean).join(" ")}>
        {notices.map((n) => (
          <Notice
          key={n.key}
          title={n.title}
          body={n.body}
          to={n.to}
          cta={n.cta}/>
        ))}
      </div>
    );
}
