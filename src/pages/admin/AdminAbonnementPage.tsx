// pages/admin/AdminAbonnementPage.tsx
import { useEffect, useMemo } from "react";
import { useLocation, useOutletContext } from "react-router-dom";

import { Container } from "../../ui/components";
import Card, { CardBody, CardHeader } from "../../ui/components/card/Card";
import Badge from "../../ui/components/badge/Badge";
import Button from "../../ui/components/button/Button";

import type { AdminOutletContext } from "./AdminDashboard";
import { supabase } from "../../gateways/supabase/supabaseClient";
import { useStartSubscription } from "../../features/admin/hooks/useStartSubscription";

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function fmtDate(d: string | null | undefined) {
  if (!d) return null;
  try {
    return new Date(d).toLocaleDateString("fr-BE", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return d as any;
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

function canStartSubscription(target: PlanKey): target is "starter" | "pro" {
  return target === "starter" || target === "pro";
}

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */

export default function AdminAbonnementPage() {
  const { bootstrap, refetch, orgId } = useOutletContext<AdminOutletContext>();
  const location = useLocation();

  const { loading: startLoading, error: startError, result, startSubscription, reset } =
    useStartSubscription({ supabase });

  const org = bootstrap.organization;
  const sub = bootstrap.subscription;
  const limits = bootstrap.planLimits;

  const plan = (org?.plan ?? "free") as PlanKey;
  const planLabel =
    plan === "free" ? "Free" : plan === "starter" ? "Starter" : "Pro";

  const qs = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const isReturn = qs.get("return") === "1";

  const periodEndLabel = useMemo(() => {
    const d = sub?.currentPeriodEnd ?? org?.planExpiresAt ?? null;
    return fmtDate(d);
  }, [sub?.currentPeriodEnd, org?.planExpiresAt]);

  const startedAtLabel = fmtDate(org?.planStartedAt ?? null);

  // ✅ UX: après retour Mollie, on refetch pour synchroniser plan / subscription
  useEffect(() => {
    if (!isReturn) return;

    let cancelled = false;

    (async () => {
      try {
        // petit refetch immédiat
        await refetch();

        // souvent le webhook arrive avec un léger délai => second refetch "best effort"
        // (pas de setTimeout: tu peux le faire plus tard si tu veux)
      } finally {
        if (!cancelled) {
          // on laisse les éventuels messages du hook
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isReturn, refetch]);

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

  async function onChoosePlan(target: PlanKey) {
    reset();

    if (!canStartSubscription(target)) return;

    const res = await startSubscription({ orgId, plan: target });
    if (!res) return;

    if (res.ok && "action" in res && res.action === "checkout") {
      // redirection Mollie checkout (first payment)
      window.location.href = res.checkoutUrl;
      return;
    }

    if (res.ok && "action" in res && res.action === "sub_created") {
      await refetch();
      return;
    }
  }

  return (
    <Container>
      {/* ---------------------- Card 0: Retour Mollie ---------------------- */}
      {isReturn && (
        <>
          <Card>
            <CardHeader
              title="Retour paiement"
              subtitle="On vérifie votre paiement et on met à jour votre plan."
            />
            <CardBody>
              <div style={{ fontSize: 14, color: "#374151" }}>
                Si votre plan ne change pas tout de suite, rafraîchis la page dans quelques secondes
                (le temps que Mollie appelle le webhook).
              </div>
            </CardBody>
          </Card>
          <div style={{ height: 16 }} />
        </>
      )}

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
                {startLoading ? "Ouverture de Mollie…" : "Changement de plan via Mollie."}
              </div>
            </div>
          </div>

          {/* ✅ feedback hook */}
          {(startError || result) && (
            <div style={{ marginTop: 14 }}>
              {startError && (
                <div
                  style={{
                    padding: "10px 12px",
                    border: "1px solid #fecaca",
                    background: "#fef2f2",
                    borderRadius: 10,
                    color: "#991b1b",
                    fontSize: 14,
                  }}
                >
                  {startError}
                </div>
              )}

              {!startError && result && (
                <div
                  style={{
                    padding: "10px 12px",
                    border: "1px solid #d1fae5",
                    background: "#ecfdf5",
                    borderRadius: 10,
                    color: "#065f46",
                    fontSize: 14,
                  }}
                >
                  {result.ok
                    ? "OK. Si Mollie s’ouvre, finalise le paiement. Sinon, ton plan est déjà à jour."
                    : "Subscription créée côté Mollie mais pas encore synchronisée côté DB."}
                </div>
              )}
            </div>
          )}
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
            <Row label="Événements / an" value={fmtLimit(limits.maxEventsPerYear)} />
            <Row label="Inscriptions / événement" value={fmtLimit(limits.maxRegistrationsPerEvent)} />
            <Row label="Produits / événement" value={fmtLimit(limits.maxProductsPerEvent)} />
            <Row label="Champs formulaire" value={fmtLimit(limits.maxFormFields)} />
            <Row label="Admins" value={fmtLimit(limits.maxAdmins)} />
            <Row label="Branding Eventflow" value={boolLabel(limits.brandingRequired)} />
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
              ? "Vous pouvez upgrader vers Pro (downgrade viendra après)."
              : "Vous pourrez redescendre en Starter plus tard."
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
                loading={startLoading}
                // ✅ on active uniquement l'upgrade (starter/pro) puisque start-subscription ne gère pas downgrade
                onAction={
                  kind === "up" && canStartSubscription(def.key)
                    ? () => onChoosePlan(def.key)
                    : undefined
                }
              />
            ))}
          </div>

          <div style={{ marginTop: 12, fontSize: 13, color: "#6b7280" }}>
            {plan === "free" && <>Upgrade via Mollie (test ok si tu as la clé test).</>}
            {plan === "starter" && (
              <>Upgrade vers Pro via Mollie. Le downgrade sera ajouté ensuite (annulation + prorata).</>
            )}
            {plan === "pro" && (
              <>Downgrade bientôt (annulation / changement de souscription).</>
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
  onAction,
  loading,
}: {
  title: string;
  price: string;
  points: string[];
  highlight?: boolean;
  kind: "up" | "down";
  currentPlan: PlanKey;
  targetPlan: PlanKey;
  onAction?: () => void;
  loading?: boolean;
}) {
  const actionLabel =
    kind === "up" ? `Passer à ${title}` : `Redescendre à ${title}`;

  const helper =
    kind === "up"
      ? "Vous garderez l’accès immédiatement après confirmation."
      : "Attention : baisse des limites et fonctionnalités.";

  const isEnabled = Boolean(onAction) && !loading;

  return (
    <div
      style={{
        border: highlight ? "2px solid var(--primary)" : "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 14,
        opacity: kind === "down" ? 0.7 : 1,
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
        <Button
          disabled={!isEnabled}
          style={{ width: "100%" }}
          onClick={onAction}
        >
          {loading && isEnabled ? "Ouverture Mollie…" : actionLabel}
        </Button>
      </div>

      <div style={{ marginTop: 10, fontSize: 12, color: "#9ca3af" }}>
        Plan actuel : {PLAN_DEFS[currentPlan].title}
      </div>
    </div>
  );
}
