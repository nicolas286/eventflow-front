// pages/admin/AdminAbonnementPage.tsx
import { useMemo } from "react";
import { useOutletContext } from "react-router-dom";

import { Container } from "../../ui/components";
import Card, { CardBody, CardHeader } from "../../ui/components/card/Card";
import Badge from "../../ui/components/badge/Badge";
import Button from "../../ui/components/button/Button";

import type { AdminOutletContext } from "./AdminDashboard";

function fmtDate(d: string | null | undefined) {
  if (!d) return null;
  try {
    return new Date(d).toLocaleDateString("fr-BE", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

function fmtLimit(v: number | null | undefined) {
  if (v === null || v === undefined) return "Illimité";
  return String(v);
}

function boolLabel(v: boolean) {
  return v ? "Oui" : "Non";
}

/* ------------------------------------------------------------------ */
/* Plans (UI source of truth)                                         */
/* ------------------------------------------------------------------ */

type PlanKey = "free" | "starter" | "pro";

type PlanDef = {
  key: PlanKey;
  title: string;
  price: string; // affichage
  short: string; // tagline
  points: string[];
  highlight?: boolean;
};

const PLAN_DEFS: Record<PlanKey, PlanDef> = {
  free: {
    key: "free",
    title: "Free",
    price: "0 €",
    short: "Pour démarrer et tester.",
    points: [
      "Événements gratuits illimités",
      "1 événement payant / an",
      "Max 50 inscrits / événement payant",
      "3 produits / événement",
      "10 champs de formulaire",
      "1 admin",
      "Branding Eventflow",
    ],
  },
  starter: {
    key: "starter",
    title: "Starter",
    price: "11,99 €/mois",
    short: "Pour les petites assos actives.",
    points: [
      "Événements gratuits illimités",
      "5 événements payants / an",
      "Inscriptions illimitées",
      "10 produits / événement",
      "30 champs de formulaire",
      "2 admins",
      "Branding personnalisé",
    ],
    highlight: true,
  },
  pro: {
    key: "pro",
    title: "Pro",
    price: "19,99 €/mois",
    short: "Pour les organisations qui scale.",
    points: [
      "Événements gratuits illimités",
      "Événements payants illimités",
      "Inscriptions illimitées",
      "10 produits / événement",
      "30 champs de formulaire",
      "5 admins",
      "Branding personnalisé",
    ],
  },
};

function neighbors(plan: PlanKey): { down?: PlanKey; up?: PlanKey } {
  if (plan === "free") return { up: "starter" };
  if (plan === "starter") return { down: "free", up: "pro" };
  return { down: "starter" }; // pro
}

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */

export default function AdminAbonnementPage() {
  const { bootstrap } = useOutletContext<AdminOutletContext>();

  const org = bootstrap.organization;
  const sub = bootstrap.subscription;
  const limits = bootstrap.planLimits;

  const plan = (org?.plan ?? "free") as PlanKey;
  const planLabel =
    plan === "free" ? "Free" : plan === "starter" ? "Starter" : "Pro";

  const periodEndLabel = useMemo(() => {
    // priorité à currentPeriodEnd si présent, sinon planExpiresAt
    const d = sub?.currentPeriodEnd ?? org?.planExpiresAt ?? null;
    return fmtDate(d);
  }, [sub?.currentPeriodEnd, org?.planExpiresAt]);

  const startedAtLabel = fmtDate(org?.planStartedAt ?? null);

  if (!bootstrap || !org) {
    return (
      <Container>
        <Card>
          <CardHeader title="Abonnement" subtitle="Chargement…" />
          <CardBody>
            <div style={{ padding: 8, color: "#6b7280", fontSize: 14 }}>
              Patiente une seconde.
            </div>
          </CardBody>
        </Card>
      </Container>
    );
  }

  const { down, up } = neighbors(plan);
  const tiles: Array<{ def: PlanDef; kind: "down" | "up" }> = [];
  if (down) tiles.push({ def: PLAN_DEFS[down], kind: "down" });
  if (up) tiles.push({ def: PLAN_DEFS[up], kind: "up" });

  const cols = tiles.length === 2 ? "1fr 1fr" : "1fr";

  return (
    <Container>
      {/* ---------------------- Card 1: Résumé ---------------------- */}
      <Card>
        <CardHeader
          title="Abonnement"
          subtitle="Votre plan actuel, votre statut, et les prochaines étapes."
        />
        <CardBody>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 16,
            }}
          >
            {/* A - Plan */}
            <div>
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>
                Plan actuel
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Badge>{planLabel}</Badge>
                <Badge>{org.status}</Badge>
              </div>
              <div style={{ marginTop: 10, fontSize: 14, color: "#374151" }}>
                Démarré le{" "}
                <span style={{ fontWeight: 600 }}>
                  {startedAtLabel ?? "—"}
                </span>
              </div>
            </div>

            {/* B - Échéance */}
            <div>
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>
                Période
              </div>

              {plan === "free" && !sub ? (
                <div style={{ fontSize: 14, color: "#374151" }}>
                  Vous êtes sur le plan <b>Free</b>.
                  <div style={{ marginTop: 6, fontSize: 13, color: "#6b7280" }}>
                    Aucune échéance, upgrade possible à tout moment.
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 14, color: "#374151" }}>
                  Prochaine échéance :{" "}
                  <span style={{ fontWeight: 600 }}>
                    {periodEndLabel ?? "—"}
                  </span>
                  <div style={{ marginTop: 6, fontSize: 13, color: "#6b7280" }}>
                    Paiement via {sub?.provider ?? org.paymentsProvider}.
                  </div>
                </div>
              )}
            </div>

            {/* C - CTA */}
            <div>
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>
                Actions
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Button disabled>
                  {plan === "pro" ? "Gérer le plan Pro" : "Changer de plan"}
                </Button>
                <Button disabled variant="secondary">
                  Historique
                </Button>
              </div>
              <div style={{ marginTop: 8, fontSize: 13, color: "#6b7280" }}>
                Changement de plan bientôt dispo (intégration Mollie en cours).
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* ---------------------- Card 2: Limites ---------------------- */}
      <div style={{ height: 16 }} />

      <Card>
        <CardHeader
          title="Limites"
          subtitle="Ce que votre plan autorise actuellement."
        />
        <CardBody>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 14,
              maxWidth: 760,
            }}
          >
            <Row
              label="Événements / an"
              value={fmtLimit(limits.maxEventsPerYear)}
            />
            <Row
              label="Inscriptions / événement"
              value={fmtLimit(limits.maxRegistrationsPerEvent)}
            />
            <Row
              label="Produits / événement"
              value={fmtLimit(limits.maxProductsPerEvent)}
            />
            <Row
              label="Champs formulaire"
              value={fmtLimit(limits.maxFormFields)}
            />
            <Row label="Admins" value={fmtLimit(limits.maxAdmins)} />
            <Row
              label="Branding Eventflow"
              value={boolLabel(limits.brandingRequired)}
            />
          </div>
        </CardBody>
      </Card>

      {/* ---------------------- Card 3: Upgrade / Downgrade ---------------------- */}
      <div style={{ height: 16 }} />

      <Card>
        <CardHeader
          title="Changer de plan"
          subtitle={
            plan === "free"
              ? "Passez au plan Starter pour débloquer plus de capacité."
              : plan === "starter"
              ? "Vous pouvez upgrader vers Pro ou redescendre en Free."
              : "Vous pouvez redescendre en Starter si besoin."
          }
        />
        <CardBody>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: cols,
              gap: 14,
              maxWidth: tiles.length === 1 ? 520 : undefined,
            }}
          >
            {tiles.map(({ def, kind }) => (
              <PlanTile
                key={def.key}
                title={def.title}
                price={def.price}
                points={def.points}
                highlight={def.highlight}
                kind={kind}
                currentPlan={plan}
                targetPlan={def.key}
              />
            ))}
          </div>

          <div style={{ marginTop: 12, fontSize: 13, color: "#6b7280" }}>
            {plan === "free" && (
              <>Upgrade bientôt dispo (paiement Mollie en cours d’intégration).</>
            )}
            {plan === "starter" && (
              <>
                Upgrade/downgrade bientôt dispo. Le downgrade peut réduire vos
                limites immédiatement.
              </>
            )}
            {plan === "pro" && (
              <>
                Downgrade bientôt dispo. Le downgrade peut réduire vos limites
                immédiatement.
              </>
            )}
          </div>
        </CardBody>
      </Card>
    </Container>
  );
}

/* ------------------------------------------------------------------ */
/* UI helpers                                                         */
/* ------------------------------------------------------------------ */

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        padding: "10px 12px",
        border: "1px solid #e5e7eb",
        borderRadius: 10,
      }}
    >
      <div style={{ fontSize: 14, color: "#374151" }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>
        {value}
      </div>
    </div>
  );
}

function PlanTile({
  title,
  price,
  points,
  highlight,
  kind,
  currentPlan,
  targetPlan,
}: {
  title: string;
  price: string;
  points: string[];
  highlight?: boolean;
  kind: "up" | "down";
  currentPlan: PlanKey;
  targetPlan: PlanKey;
}) {
  const actionLabel =
    kind === "up" ? `Passer à ${title}` : `Redescendre à ${title}`;

  const helper =
    kind === "up"
      ? "Vous garderez l’accès immédiatement après confirmation."
      : "Attention : baisse des limites et fonctionnalités.";

  return (
    <div
      style={{
        border: highlight ? "2px solid var(--primary)" : "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 14,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{title}</div>
          <div style={{ fontSize: 13, color: "#6b7280" }}>
            {PLAN_DEFS[targetPlan].short}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 6,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 800 }}>{price}</div>
          <Badge>{kind === "up" ? "Upgrade" : "Downgrade"}</Badge>
        </div>
      </div>

      <ul style={{ marginTop: 10, paddingLeft: 18, color: "#374151" }}>
        {points.map((p) => (
          <li key={p} style={{ marginBottom: 6, fontSize: 14 }}>
            {p}
          </li>
        ))}
      </ul>

      <div style={{ marginTop: 10, fontSize: 13, color: "#6b7280" }}>
        {helper}
      </div>

      <div style={{ marginTop: 12 }}>
        <Button disabled style={{ width: "100%" }}>
          {actionLabel}
        </Button>
      </div>

      {/* petit détail optionnel : rappeler où on est */}
      <div style={{ marginTop: 10, fontSize: 12, color: "#9ca3af" }}>
        Plan actuel : {PLAN_DEFS[currentPlan].title}
      </div>
    </div>
  );
}
