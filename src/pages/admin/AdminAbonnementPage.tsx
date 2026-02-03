import { useEffect, useMemo, useRef } from "react";
import { useLocation, useOutletContext, useNavigate } from "react-router-dom";

import { Container } from "../../ui/components";
import Card, { CardBody, CardHeader } from "../../ui/components/card/Card";
import Badge from "../../ui/components/badge/Badge";
import Button from "../../ui/components/button/Button";

import type { AdminOutletContext } from "./AdminDashboard";
import { supabase } from "../../gateways/supabase/supabaseClient";
import { useStartSubscription } from "../../features/admin/hooks/useStartSubscription";
import { useCancelSubscription } from "../../features/admin/hooks/useCancelSubscription";

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

      const {
    loading: cancelLoading,
    error: cancelError,
    result: cancelResult,
    cancelSubscription,
    reset: resetCancel,
  } = useCancelSubscription({ supabase });



  const org = bootstrap.organization;
  const sub = bootstrap.subscription;
  const limits = bootstrap.planLimits;

  const plan = (org?.plan ?? "free") as PlanKey;
  const isPaidPlan = plan === "starter" || plan === "pro";
  const planLabel =
    plan === "free" ? "Free" : plan === "starter" ? "Starter" : "Pro";

  const qs = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const isReturn = qs.get("return") === "1";

  const periodEndLabel = useMemo(() => {
    const d = sub?.currentPeriodEnd ?? org?.planExpiresAt ?? null;
    return fmtDate(d);
  }, [sub?.currentPeriodEnd, org?.planExpiresAt]);

  const startedAtLabel = fmtDate(org?.planStartedAt ?? null);

      const navigate = useNavigate();
  const didHandleReturn = useRef(false);

  useEffect(() => {
    if (!isReturn) return;
    if (didHandleReturn.current) return;
    didHandleReturn.current = true;

    const nextQs = new URLSearchParams(location.search);
    nextQs.delete("return");

    (async () => {
      try {
        await refetch();
      } finally {
        const search = nextQs.toString();
        navigate(
          {
            pathname: location.pathname,
            search: search ? `?${search}` : "",
          },
          { replace: true }
        );
      }
    })();
  }, [isReturn, refetch, navigate, location.pathname, location.search]);



  if (!bootstrap || !org) {
    return (
      <Container>
        <Card>
          <CardHeader title="Abonnement" subtitle="Chargement…" />
          <CardBody>
            <div style={{ padding: 8, color: "#6b7280", fontSize: 14 }}>
              Veuillez patienter.
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

    async function onCancelPlan() {
    resetCancel();

    if (!isPaidPlan) return;

    const ok = window.confirm(
      "Confirmer la résiliation ?\n\nVotre organisation repassera en Free et les limites seront réduites."
    );
    if (!ok) return;

    const res = await cancelSubscription({ orgId });
    if (!res?.ok) return;

    await refetch();
  }


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
                    ? "Demande bien enregistrée. Si Mollie s’ouvre, finalisez le paiement. Sinon, le plan est déjà à jour."
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

            {/* ---------------------- Card 3: Changer de plan ---------------------- */}
      <div style={{ height: 16 }} />

      <Card>
        <CardHeader
          title="Changer de plan"
          subtitle={
            plan === "free"
              ? "Passez au plan Starter pour débloquer plus de capacité."
              : plan === "starter"
              ? "Vous pouvez upgrader vers Pro."
              : "Vous êtes sur le plan Pro."
          }
        />
        <CardBody>
          {/* -------- Upgrade tiles (uniquement vers le haut) -------- */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14, maxWidth: 520 }}>
            {plan === "free" && (
              <PlanTile
                title={PLAN_DEFS.starter.title}
                price={PLAN_DEFS.starter.price}
                points={PLAN_DEFS.starter.points}
                highlight={PLAN_DEFS.starter.highlight}
                kind="up"
                currentPlan={plan}
                targetPlan="starter"
                loading={startLoading || cancelLoading}
                onAction={() => onChoosePlan("starter")}
              />
            )}

            {plan === "starter" && (
              <PlanTile
                title={PLAN_DEFS.pro.title}
                price={PLAN_DEFS.pro.price}
                points={PLAN_DEFS.pro.points}
                highlight={PLAN_DEFS.pro.highlight}
                kind="up"
                currentPlan={plan}
                targetPlan="pro"
                loading={startLoading || cancelLoading}
                onAction={() => onChoosePlan("pro")}
              />
            )}
          </div>

          {/* -------- Résiliation (starter/pro -> free) -------- */}
          {isPaidPlan && (
            <>
              <div style={{ height: 16 }} />

              <div
                style={{
                  border: "1px solid #fee2e2",
                  background: "#fff1f2",
                  borderRadius: 12,
                  padding: 14,
                  maxWidth: 520,
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 700, color: "#991b1b" }}>
                  Résilier l’abonnement
                </div>

                <div style={{ marginTop: 6, fontSize: 13, color: "#7f1d1d" }}>
                  Vous repasserez sur le plan <b>Free</b>. Les limites (admins, produits, champs, etc.)
                  seront réduites immédiatement après confirmation.
                </div>

                <div style={{ marginTop: 12 }}>
                  <Button
                    variant="secondary"
                    style={{ width: "100%" }}
                    disabled={startLoading || cancelLoading}
                    onClick={onCancelPlan}
                  >
                    {cancelLoading ? "Résiliation…" : "Annuler l’abonnement et repasser en Free"}
                  </Button>
                </div>

                {/* feedback cancel */}
                {(cancelError || cancelResult) && (
                  <div style={{ marginTop: 12 }}>
                    {cancelError && (
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
                        {cancelError}
                      </div>
                    )}

                    {!cancelError && cancelResult && (
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
                        {cancelResult.ok
                          ? "Abonnement résilié. Votre organisation est repassée en Free."
                          : "Résiliation lancée mais pas encore synchronisée côté DB."}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          <div style={{ marginTop: 12, fontSize: 13, color: "#6b7280" }}>
            {plan === "free" && <>Upgrade vers Starter via Mollie.</>}
            {plan === "starter" && <>Upgrade vers Pro via Mollie.</>}
            {plan === "pro" && <>Vous pouvez résilier à tout moment.</>}
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
