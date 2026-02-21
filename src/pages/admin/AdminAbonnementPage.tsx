import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useOutletContext, useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "../../ui/components/toast/useToast";

import { Container } from "../../ui/components";
import Card, { CardBody, CardHeader } from "../../ui/components/card/Card";
import Badge from "../../ui/components/badge/Badge";
import Button from "../../ui/components/button/Button";

import type { AdminOutletContext } from "./AdminDashboard";
import { supabase } from "../../gateways/supabase/supabaseClient";
import { useStartSubscription } from "../../features/admin/hooks/useStartSubscription";
import { useCancelSubscription } from "../../features/admin/hooks/useCancelSubscription";
import { useMakeOrganizationBilling } from "../../features/admin/hooks/useMakeOrganizationBilling";
import { useUpsertOrganizationBilling } from "../../features/admin/hooks/useUpsertOrganizationBilling";

import BillingModal from "../../features/admin/subscriptions/BillingModal";
import { InvoicesTab } from "../../features/admin/subscriptions/InvoicesTab";

import "../../styles/desktop/admin/adminSubscription.desktop.css";
import "../../styles/mobile/admin/adminSubscription.mobile.css";
import "../../styles/desktop/admin/adminEventsPage.desktop.css";


/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

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
  price: string;
  short: string;
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
      "Branding Eventflow",
    ],
  },
  starter: {
    key: "starter",
    title: "Starter",
    price: "15,99 €/mois",
    short: "Pour les petites assos actives.",
    points: [
      "Événements gratuits illimités",
      "5 événements payants / an",
      "Inscriptions illimitées",
      "Couleur & Logo personnalisés",
    ],
    highlight: true,
  },
  pro: {
    key: "pro",
    title: "Pro",
    price: "25,99 €/mois",
    short: "Pour les organisations qui scalent.",
    points: [
      "Événements gratuits illimités",
      "Événements payants illimités",
      "Inscriptions illimitées",
      "Couleur & Logo personnalisés",
    ],
  },
};

function canStartSubscription(target: PlanKey): target is "starter" | "pro" {
  return target === "starter" || target === "pro";
}

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */

export default function AdminAbonnementPage() {
  const { bootstrap, refetch, orgId } = useOutletContext<AdminOutletContext>();
  const location = useLocation();
  const billingGet = useMakeOrganizationBilling({ supabase });
  const billingUpsert = useUpsertOrganizationBilling({ supabase });
  const { showToast } = useToast();

  const [billingModalOpen, setBillingModalOpen] = useState(false);
  const [billingModalMode, setBillingModalMode] = useState<"required" | "edit">("required");
  const [pendingPlan, setPendingPlan] = useState<PlanKey | null>(null);

  type TabKey = "general" | "invoices";
  const TAB_KEYS: TabKey[] = ["general", "invoices"];
  function isTabKey(v: string | null): v is TabKey {
    return !!v && (TAB_KEYS as string[]).includes(v);
  }

  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl: TabKey = isTabKey(searchParams.get("tab")) ? (searchParams.get("tab") as TabKey) : "general";
  const [tab, setTab] = useState<TabKey>(tabFromUrl);

  useEffect(() => {
    if (tab !== tabFromUrl) setTab(tabFromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabFromUrl]);

  

  function setTabAndUrl(next: TabKey) {
    setTab(next);
    setSearchParams(
      (prev) => {
        const sp = new URLSearchParams(prev);
        sp.set("tab", next);
        return sp;
      },
      { replace: true }
    );
  }

  const { loading: startLoading, error: startError, result, startSubscription, reset } =
    useStartSubscription({ supabase });

    useEffect(() => {
  if (startError) {
    showToast({ title: "Erreur", description: startError, variant: "error", duration: 7000 });
  }
}, [startError, showToast]);

useEffect(() => {
  if (!result) return;
  showToast({
    title: result.ok ? "Demande enregistrée" : "Synchronisation en attente",
    description: result.ok
      ? "Si Mollie s’ouvre, finalisez le paiement. Sinon, le plan est déjà à jour."
      : "Paiement ok côté Mollie, en attente de synchro côté Eventflow.",
    variant: result.ok ? "success" : "warning",
    duration: 6000,
  });
}, [result, showToast]);

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
  const planLabel = plan === "free" ? "Free" : plan === "starter" ? "Starter" : "Pro";

  const qs = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const isReturn = qs.get("return") === "1";

  const periodEndLabel = useMemo(() => {
    const d = sub?.currentPeriodEnd ?? org?.planExpiresAt ?? null;
    return fmtDate(d);
  }, [sub?.currentPeriodEnd, org?.planExpiresAt]);

  const startedAtLabel = fmtDate(org?.planStartedAt ?? null);

  const navigate = useNavigate();
  const didHandleReturn = useRef(false);

  const [isSyncingReturn, setIsSyncingReturn] = useState(false);

useEffect(() => {
  if (!isReturn) return;
  if (didHandleReturn.current) return;
  didHandleReturn.current = true;

  const nextQs = new URLSearchParams(location.search);
  nextQs.delete("return");

  (async () => {
    setIsSyncingReturn(true);

    // ✅ toast "patience"
    showToast({
      title: "Paiement reçu",
      description: "Synchronisation en cours… ça peut prendre quelques secondes.",
      variant: "info",
      duration: 5000,
    });

    let synced = false;

    try {
      const maxTries = 12; // ~24s
      const delayMs = 2000;

      for (let i = 0; i < maxTries; i++) {
        await refetch();

        const p = (bootstrap.organization?.plan ?? "free") as PlanKey;
        if (p !== "free") {
          synced = true;
          break;
        }

        await sleep(delayMs);
      }
    } catch {
      // rien, on gère juste via toast ci-dessous
    } finally {
      setIsSyncingReturn(false);

      // ✅ toast résultat
      showToast(
        synced
          ? {
              title: "Abonnement activé",
              description: "Votre plan est à jour. Merci !",
              variant: "success",
              duration: 4500,
            }
          : {
              title: "Synchronisation en attente",
              description: "Ça peut encore prendre un moment. Rafraîchissez la page si nécessaire.",
              variant: "warning",
              duration: 6500,
            }
      );

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [isReturn, refetch, navigate, location.pathname, location.search]);


  async function ensureBillingOrOpenModal(nextPlan: "starter" | "pro"): Promise<boolean> {
    const billing = await billingGet.fetchBilling(orgId);
    if (billing) return true;

    setPendingPlan(nextPlan);
    setBillingModalMode("required");
    setBillingModalOpen(true);
    return false;
  }

  if (!bootstrap || !org) {
    return (
      <Container>
        <Card>
          <CardHeader title="Abonnement" subtitle="Chargement…" />
          <CardBody>
            <div className="adminSub__loadingNote">Veuillez patienter.</div>
          </CardBody>
        </Card>
      </Container>
    );
  }

  async function onChoosePlan(target: PlanKey) {
    reset();

    if (!canStartSubscription(target)) return;

    const okBilling = await ensureBillingOrOpenModal(target);
    if (!okBilling) return;

    const res = await startSubscription({ orgId, plan: target });
    if (!res) return;

    if (res.ok && "action" in res && res.action === "checkout") {
      showToast({
          title: "Redirection vers Mollie",
          description: "Finalisez le paiement, puis revenez sur cette page.",
          variant: "info",
          duration: 4000,
        });
      window.location.href = res.checkoutUrl;
      return;
    }

    if (res.ok && "action" in res && res.action === "sub_created") {
      await refetch();
      showToast({
        title: "Plan mis à jour",
        description: "Votre abonnement a été mis à jour.",
        variant: "success",
        duration: 4500,
      });
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

  const anyLoading = startLoading || cancelLoading;

  return (
    <Container>
      <div className="adminEventTabs">
        <div className="adminEventTabsInner">
        <TabButton active={tab === "general"} onClick={() => setTabAndUrl("general")}>
          Général
        </TabButton>
        <TabButton active={tab === "invoices"} onClick={() => setTabAndUrl("invoices")}>
          Mes factures
        </TabButton>
        </div>
      </div>

      {tab === "general" && (
        <>
          {/* ---------------------- Card 1: Résumé ---------------------- */}
          <Card>
            <CardHeader
              title="Abonnement"
              subtitle="Votre plan actuel, votre statut, et les prochaines étapes."
            />
            <CardBody>
              {isSyncingReturn && (
                <div className="adminSub__mutedLine">
                  Synchronisation du paiement… votre plan peut mettre quelques secondes à s’actualiser.
                </div>
              )}
              <div className="adminSub__summaryGrid">
                {/* A - Plan */}
                <div className="adminSub__summaryCol">
                  <div className="adminSub__label">Plan actuel</div>
                  <div className="adminSub__badges">
                    <Badge>{planLabel}</Badge>
                    <Badge>{org.status}</Badge>
                  </div>
                  <div className="adminSub__line">
                    Démarré le <span className="adminSub__valueStrong">{startedAtLabel ?? "—"}</span>
                  </div>
                </div>

                {/* B - Échéance */}
                <div className="adminSub__summaryCol">
                  <div className="adminSub__label">Période</div>

                  {plan === "free" && !sub ? (
                    <div className="adminSub__text">
                      Vous êtes sur le plan <b>Free</b>.
                      <div className="adminSub__mutedLine">
                        Aucune échéance, upgrade possible à tout moment.
                      </div>
                    </div>
                  ) : (
                    <div className="adminSub__text">
                      Prochaine échéance :{" "}
                      <span className="adminSub__valueStrong">{periodEndLabel ?? "—"}</span>
                      <div className="adminSub__mutedLine">
                        Paiement via {sub?.provider ?? org.paymentsProvider}.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="adminSub__actionsRow">
                <Button
                  variant="secondary"
                  disabled={billingGet.loading || billingUpsert.loading}
                  onClick={async () => {
                    setBillingModalMode("edit");
                    setPendingPlan(null);
                    setBillingModalOpen(true);
                    await billingGet.fetchBilling(orgId);
                  }}
                >
                  Infos de facturation
                </Button>
              </div>

            </CardBody>
          </Card>

          <div className="adminSub__spacer" />

          {/* ---------------------- Card 2: Limites ---------------------- */}
          <Card>
            <CardHeader title="Limites" subtitle="Ce que votre plan autorise actuellement." />
            <CardBody>
              <div className="adminSub__limitsGrid">
                <Row label="Événements / an" value={fmtLimit(limits.maxEventsPerYear)} />
                <Row label="Inscriptions / événement" value={fmtLimit(limits.maxRegistrationsPerEvent)} />
                <Row label="Branding Eventflow" value={boolLabel(limits.brandingRequired)} />
              </div>
            </CardBody>
          </Card>

          <div className="adminSub__spacer" />

          {/* ---------------------- Card 3: Changer de plan ---------------------- */}
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
              <div className={isPaidPlan ? "adminSub__plan2Col" : ""}>
                {/* Gauche : upgrade */}
                <div className="adminSub__plansWrap">
                  {plan === "free" && (
                    <PlanTile
                      title={PLAN_DEFS.starter.title}
                      price={PLAN_DEFS.starter.price}
                      points={PLAN_DEFS.starter.points}
                      highlight={PLAN_DEFS.starter.highlight}
                      kind="up"
                      currentPlan={plan}
                      targetPlan="starter"
                      loading={anyLoading}
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
                      loading={anyLoading}
                      onAction={() => onChoosePlan("pro")}
                    />
                  )}
                </div>

                {/* Droite : résiliation */}
                {isPaidPlan ? (
                  <div className="adminSub__cancelCol">
                    <div className="adminSub__dangerBox">
                      <div className="adminSub__dangerTitle">Résilier l’abonnement</div>

                      <div className="adminSub__dangerText">
                        Vous repasserez sur le plan <b>Free</b>. Les limites (admins, produits, champs, etc.) seront réduites
                        immédiatement après confirmation.
                      </div>

                      <div className="adminSub__dangerAction">
                        <Button
                          variant="danger"
                          className="adminSub__fullWidthBtn"
                          disabled={anyLoading}
                          onClick={onCancelPlan}
                        >
                          {cancelLoading ? "Résiliation…" : "Annuler l’abonnement et repasser en Free"}
                        </Button>
                      </div>

                      {(cancelError || cancelResult) && (
                        <div className="adminSub__feedbackWrap">
                          {cancelError && (
                            <div className="adminSub__alert adminSub__alert--error">{cancelError}</div>
                          )}

                          {!cancelError && cancelResult && (
                            <div className="adminSub__alert adminSub__alert--success">
                              {cancelResult.ok
                                ? "Abonnement résilié. Votre organisation est repassée en Free."
                                : "Résiliation lancée mais pas encore synchronisée côté DB."}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="adminSub__footNote">
                {plan === "free" && <>Upgrade vers Starter via Mollie.</>}
                {plan === "starter" && <>Upgrade vers Pro via Mollie.</>}
                {plan === "pro" && <>Vous pouvez résilier à tout moment.</>}
              </div>
            </CardBody>
          </Card>
        </>
      )}

      {tab === "invoices" && <InvoicesTab orgId={orgId} />}

      {billingModalOpen && (
        <BillingModal
          mode={billingModalMode}
          loading={billingGet.loading || billingUpsert.loading}
          error={billingGet.error || billingUpsert.error}
          initial={billingGet.billing}
          onClose={() => {
            setBillingModalOpen(false);
            billingGet.reset();
            billingUpsert.reset();
          }}
          onSave={async (patch) => {
            const updated = await billingUpsert.upsertOrganizationBilling(patch);
            if (!updated) return;

            await billingGet.fetchBilling(orgId);

            const planToContinue = pendingPlan;
            setBillingModalOpen(false);
            setPendingPlan(null);

            if (planToContinue && canStartSubscription(planToContinue)) {
              const res = await startSubscription({ orgId, plan: planToContinue });
                  if (!res) {
                    showToast({
                      title: "Impossible de démarrer l’abonnement",
                      description: "Réessayez dans quelques instants.",
                      variant: "error",
                      duration: 6000,
                    });
                    return;
                  }
                  if (!res.ok) {
                    showToast({
                      title: "Erreur de paiement",
                      description: "La demande a échoué. Vérifiez vos infos et réessayez.",
                      variant: "error",
                      duration: 6000,
                    });
                    return;
                  }

              if (res.ok && "action" in res && res.action === "checkout") {
                window.location.href = res.checkoutUrl;
                return;
              }

              if (res.ok && "action" in res && res.action === "sub_created") {
                await refetch();
                return;
              }
            }
          }}
          orgId={orgId}
        />
      )}
    </Container>
  );
}

/* ------------------------------------------------------------------ */
/* UI helpers                                                         */
/* ------------------------------------------------------------------ */

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="adminSub__limitRow">
      <div className="adminSub__limitLabel">{label}</div>
      <div className="adminSub__limitValue">{value}</div>
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
  const actionLabel = kind === "up" ? `Passer à ${title}` : `Redescendre à ${title}`;

  const helper =
    kind === "up"
      ? "Vous garderez l’accès immédiatement après confirmation."
      : "Attention : baisse des limites et fonctionnalités.";

  const isEnabled = Boolean(onAction) && !loading;

  return (
    <div className={highlight ? "adminSub__planTile isHighlight" : "adminSub__planTile"}>
      <div className="adminSub__planTop">
        <div className="adminSub__planLeft">
          <div className="adminSub__planTitle">{title}</div>
          <div className="adminSub__planShort">{PLAN_DEFS[targetPlan].short}</div>
        </div>

        <div className="adminSub__planRight">
          <div className="adminSub__planPrice">{price}</div>
          <Badge>{kind === "up" ? "Upgrade" : "Downgrade"}</Badge>
        </div>
      </div>

      <ul className="adminSub__planPoints">
        {points.map((p) => (
          <li key={p} className="adminSub__planPoint">
            {p}
          </li>
        ))}
      </ul>

      <div className="adminSub__planHelper">{helper}</div>

      <div className="adminSub__planAction">
        <Button
          disabled={!isEnabled}
          className="adminSub__fullWidthBtn"
          onClick={onAction}
        >
          {loading && isEnabled ? "Ouverture Mollie…" : actionLabel}
        </Button>
      </div>

      <div className="adminSub__planCurrent">Plan actuel : {PLAN_DEFS[currentPlan].title}</div>
    </div>
  );
}

function TabButton(props: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  const { active, onClick, children } = props;
  return (
    <button
      onClick={onClick}
      className={active ? "adminEventTab isActive" : "adminEventTab"}
      type="button"
    >
      {children}
    </button>
  );
}
