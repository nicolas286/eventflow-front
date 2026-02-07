// src/ui/components/admin/AdminNotices.tsx
import { Link } from "react-router-dom";
import type { DashboardBootstrap } from "../../../domain/models/admin/admin.dashboardBootstrap.schema";

type Props = {
  bootstrap: DashboardBootstrap;
  className?: string;
};

type Notice = {
  key: string;
  title: string;
  body: string;
  to: string;
  cta: string;
};

function isBlank(v: unknown) {
  return v === null || v === undefined || (typeof v === "string" && v.trim() === "");
}

export function AdminNotices({ bootstrap, className }: Props) {
  const notices: Notice[] = [];

  const plan = bootstrap.organization?.plan ?? "free";
  const paymentsStatus = bootstrap.organization?.paymentsStatus ?? "not_connected";

  // 1) Plan free => CTA upgrade
  if (plan === "free") {
    notices.push({
      key: "plan-free",
      title: "Plan Free",
      body: "Certaines options sont limitées (branding, etc.). Passez en Starter/Pro pour débloquer.",
      to: "/admin/abonnement",
      cta: "Voir les plans",
    });
  }

  // 2) Adresse profil perso incomplète
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

  // 3) Description org manquante
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

  // 4) Mollie non connecté
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
        <div key={n.key} className="adminNotice">
          <div className="adminNoticeText">
            <div className="adminNoticeTitle">{n.title}</div>
            <div className="adminNoticeBody">{n.body}</div>
          </div>

          <Link className="adminNoticeCta" to={n.to}>
            {n.cta}
          </Link>
        </div>
      ))}
    </div>
  );
}
