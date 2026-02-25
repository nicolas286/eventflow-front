import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useOutletContext, useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "../../ui/components/toast/useToast";

import { Container } from "../../ui/components";
import Card, { CardBody, CardHeader } from "../../ui/components/card/Card";
import Badge from "../../ui/components/badge/Badge";
import Button from "../../ui/components/button/Button";
import { Input } from "../../ui/components";
import CountrySelect from "../../ui/components/forms/CountrySelect";

import type { AdminOutletContext } from "./AdminDashboard";
import { supabase } from "../../gateways/supabase/supabaseClient";
import { useStartSubscription } from "../../features/admin/hooks/useStartSubscription";
import { useCancelSubscription } from "../../features/admin/hooks/useCancelSubscription";
import { useMakeOrganizationBilling } from "../../features/admin/hooks/useMakeOrganizationBilling";
import { useUpsertOrganizationBilling } from "../../features/admin/hooks/useUpsertOrganizationBilling";

import type { OrganizationBilling, OrganizationBillingPatch } from "../../domain/models/db/db.organizationBilling.schema";
import { inferCountryCode } from "../../domain/helpers/countries";

import { InvoicesTab } from "../../features/admin/subscriptions/InvoicesTab";
import { countryCodeToLabel } from "../../domain/helpers/countries";

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
/* Billing helpers                                                    */
/* ------------------------------------------------------------------ */

function t(v: string) {
  return v.trim();
}
function toNullIfEmpty(v: string): string | null {
  const s = t(v);
  return s ? s : null;
}

/* ------------------------------------------------------------------ */
/* Plans                                                              */
/* ------------------------------------------------------------------ */

type PlanKey = "free" | "starter" | "pro";

type PlanDef = {
  key: PlanKey;
  title: string;
  price: string;
  short: string;
  points: string[];
  highlight?: boolean;
  ctaLabel?: string;
};

const PLAN_DEFS: Record<PlanKey, PlanDef> = {
  free: {
    key: "free",
    title: "Free",
    price: "0 €",
    short: "Pour démarrer et tester.",
    points: ["Événements gratuits illimités", "1 événement payant / an", "Max 50 inscrits / événement payant", "Branding Eventflow"],
  },
  starter: {
    key: "starter",
    title: "Starter",
    price: "15,99 €/mois",
    short: "Pour les petites assos actives.",
    points: ["Événements gratuits illimités", "5 événements payants / an", "Inscriptions illimitées", "Couleur & Logo personnalisés"],
    highlight: false,
    ctaLabel: "Passer en Starter",
  },
  pro: {
    key: "pro",
    title: "Pro",
    price: "25,99 €/mois",
    short: "Le meilleur pour scaler (illimité).",
    points: ["Événements gratuits illimités", "Événements payants illimités", "Inscriptions illimitées", "Couleur & Logo personnalisés"],
    highlight: true,
    ctaLabel: "Passer en Pro",
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
  const navigate = useNavigate();
  const { showToast } = useToast();

  const billingGet = useMakeOrganizationBilling({ supabase });
  const billingUpsert = useUpsertOrganizationBilling({ supabase });

  const [pendingPlan, setPendingPlan] = useState<PlanKey | null>(null);

  type TabKey = "general" | "invoices" | "billing";
  const TAB_KEYS: TabKey[] = ["general", "invoices", "billing"];
  function isTabKey(v: string | null): v is TabKey {
    return !!v && (TAB_KEYS as string[]).includes(v);
  }

  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl: TabKey = isTabKey(searchParams.get("tab")) ? (searchParams.get("tab") as TabKey) : "general";
  const [tab, setTab] = useState<TabKey>(tabFromUrl);
  const [billingKey, setBillingKey] = useState(0);

  useEffect(() => {
  if (tabFromUrl === "billing") {
    billingGet.fetchBilling(orgId);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [tabFromUrl, orgId]);

  function setTabAndUrl(next: TabKey) {
  setTab(next);

  if (next === "billing") {
    billingGet.fetchBilling(orgId);
  }

  setSearchParams(
    (prev) => {
      const sp = new URLSearchParams(prev);
      sp.set("tab", next);
      return sp;
    },
    { replace: true }
  );
}

  const { loading: startLoading, error: startError, result, startSubscription, reset } = useStartSubscription({ supabase });

  const { loading: cancelLoading, error: cancelError, result: cancelResult, cancelSubscription, reset: resetCancel } =
    useCancelSubscription({ supabase });

  useEffect(() => {
    if (!startError) return;
    showToast({ title: "Erreur", description: startError, variant: "error", duration: 7000 });
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

  useEffect(() => {
    if (!cancelError) return;
    showToast({ title: "Erreur", description: cancelError, variant: "error", duration: 7000 });
  }, [cancelError, showToast]);

  useEffect(() => {
    if (!cancelResult) return;
    showToast({
      title: cancelResult.ok ? "Abonnement résilié" : "Résiliation en attente",
      description: cancelResult.ok ? "Vous êtes repassé en Free. Les limites sont appliquées." : "Résiliation lancée. La synchronisation peut prendre un moment.",
      variant: cancelResult.ok ? "success" : "warning",
      duration: 6500,
    });
  }, [cancelResult, showToast]);

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

      showToast({
        title: "Paiement reçu",
        description: "Synchronisation en cours… ça peut prendre quelques secondes.",
        variant: "info",
        duration: 5000,
      });

      const beforePlan = (bootstrap.organization?.plan ?? "free") as PlanKey;
      let synced = false;

      try {
        const maxTries = 12;
        const delayMs = 2000;

        for (let i = 0; i < maxTries; i++) {
          await refetch();
          const current = (bootstrap.organization?.plan ?? "free") as PlanKey;

          if (current !== beforePlan) {
            synced = true;
            break;
          }

          await sleep(delayMs);
        }
      } finally {
        setIsSyncingReturn(false);

        showToast(
          synced
            ? { title: "Plan mis à jour", description: "Votre abonnement est à jour. Merci !", variant: "success", duration: 4500 }
            : { title: "Synchronisation en attente", description: "Ça peut encore prendre un moment. Rafraîchissez la page si besoin.", variant: "warning", duration: 6500 }
        );

        const search = nextQs.toString();
        navigate({ pathname: location.pathname, search: search ? `?${search}` : "" }, { replace: true });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReturn, refetch, navigate, location.pathname, location.search]);

  async function ensureBillingOrGoToTab(nextPlan: "starter" | "pro"): Promise<boolean> {
    const billing = await billingGet.fetchBilling(orgId);
    if (billing) return true;

    setPendingPlan(nextPlan);
    setTabAndUrl("billing");

    showToast({
      title: "Infos de facturation requises",
      description: "Complétez la facturation pour activer un plan payant.",
      variant: "info",
      duration: 6000,
    });

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

    const okBilling = await ensureBillingOrGoToTab(target);
    if (!okBilling) return;

    const res = await startSubscription({ orgId, plan: target });

    if (!res) {
      showToast({ title: "Impossible de démarrer l’abonnement", description: "Réessayez dans quelques instants.", variant: "error", duration: 6000 });
      return;
    }

    if (!res.ok) {
      showToast({ title: "Erreur de paiement", description: "La demande a échoué. Vérifiez vos infos et réessayez.", variant: "error", duration: 6000 });
      return;
    }

    if ("action" in res && res.action === "checkout") {
      showToast({ title: "Redirection vers Mollie", description: "Finalisez le paiement, puis revenez sur cette page.", variant: "info", duration: 4000 });
      window.location.href = res.checkoutUrl;
      return;
    }

    if ("action" in res && res.action === "sub_created") {
      await refetch();
      showToast({ title: "Plan mis à jour", description: "Votre abonnement a été mis à jour.", variant: "success", duration: 4500 });
      return;
    }
  }

  async function onCancelPlan() {
    resetCancel();

    if (!isPaidPlan) return;

    const ok = window.confirm("Confirmer la résiliation ?\n\nVotre organisation repassera en Free et les limites seront réduites.");
    if (!ok) return;

    const res = await cancelSubscription({ orgId });
    if (!res?.ok) return;

    await refetch();

    showToast({
      title: "Retour en Free",
      description: "OK. Les limites Free sont appliquées. (Si ça tarde: rafraîchissez.)",
      variant: "success",
      duration: 6000,
    });
  }

  const anyLoading = startLoading || cancelLoading;

  const upgradeTiles =
    plan === "free" ? (["pro", "starter"] as const) : plan === "starter" ? (["pro"] as const) : ([] as const);

  return (
 <Container>
    <div className="adminSub__page">

      <div className="adminEventTabs">
        <div className="adminEventTabsInner">
          <TabButton active={tab === "general"} onClick={() => setTabAndUrl("general")}>
            Général
          </TabButton>
          <TabButton active={tab === "invoices"} onClick={() => setTabAndUrl("invoices")}>
            Mes factures
          </TabButton>
          <TabButton active={tab === "billing"} onClick={() => setTabAndUrl("billing")}>
            Facturation
          </TabButton>
        </div>
      </div>

      {tab === "general" && (
        <>
          <Card>
            <CardHeader title="Abonnement" subtitle="Votre plan actuel, votre statut, et les prochaines étapes." />
            <CardBody>
              {isSyncingReturn && <div className="adminSub__mutedLine">Synchronisation du paiement… votre plan peut mettre quelques secondes à s’actualiser.</div>}

              <div className="adminSub__summaryGrid">
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

                <div className="adminSub__summaryCol">
                  <div className="adminSub__label">Période</div>

                  {plan === "free" && !sub ? (
                    <div className="adminSub__text">
                      Vous êtes sur le plan <b>Free</b>.
                      <div className="adminSub__mutedLine">Aucune échéance, upgrade possible à tout moment.</div>
                    </div>
                  ) : (
                    <div className="adminSub__text">
                      Prochaine échéance : <span className="adminSub__valueStrong">{periodEndLabel ?? "—"}</span>
                      <div className="adminSub__mutedLine">Paiement via {sub?.provider ?? org.paymentsProvider}.</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="adminSub__actionsRow">
                <Button
                  variant="secondary"
                  disabled={billingGet.loading || billingUpsert.loading}
                  onClick={() => {
                    setPendingPlan(null);
                    setTabAndUrl("billing");
                  }}
                >
                  Infos de facturation
                </Button>
              </div>
            </CardBody>
          </Card>

          <div className="adminSub__spacer" />

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

          <Card>
            <CardHeader
              title="Changer de plan"
              subtitle={
                plan === "free"
                  ? "Choisissez un plan payant pour débloquer plus de fonctionnalités et soutenir Eventflow."
                  : plan === "starter"
                  ? "Vous pouvez upgrader vers Pro."
                  : "Vous êtes sur le plan Pro."
              }
            />
            <CardBody>
              <div className={isPaidPlan ? "adminSub__plan2Col" : ""}>
                <div className={plan === "free" ? "adminSub__plansWrap isFlex" : "adminSub__plansWrap"}>
                  {upgradeTiles.map((target) => (
                    <PlanTile
                      key={target}
                      title={PLAN_DEFS[target].title}
                      price={PLAN_DEFS[target].price}
                      points={PLAN_DEFS[target].points}
                      highlight={PLAN_DEFS[target].highlight}
                      kind="up"
                      currentPlan={plan}
                      targetPlan={target}
                      loading={anyLoading}
                      onAction={() => onChoosePlan(target)}
                      badgeLabel={target === "pro" ? "Recommandé" : "Upgrade"}
                      actionLabelOverride={PLAN_DEFS[target].ctaLabel}
                      helperOverride={target === "pro" ? "Le meilleur choix si vous faites des événements payants régulièrement." : undefined}
                      buttonVariant={target === "starter" ? "secondary" : undefined}
                    />
                  ))}
                </div>

                {isPaidPlan ? (
                  <div className="adminSub__cancelCol">
                    <div className="adminSub__dangerBox">
                      <div className="adminSub__dangerTitle">Résilier l’abonnement</div>

                      <div className="adminSub__dangerText">
                        Vous repasserez sur le plan <b>Free</b>. Les limites (admins, produits, champs, etc.) seront réduites immédiatement après confirmation.
                      </div>

                      <div className="adminSub__dangerAction">
                        <Button variant="danger" className="adminSub__fullWidthBtn" disabled={anyLoading} onClick={onCancelPlan}>
                          {cancelLoading ? "Résiliation…" : "Annuler l’abonnement et repasser en Free"}
                        </Button>
                      </div>

                      {(cancelError || cancelResult) && (
                        <div className="adminSub__feedbackWrap">
                          {cancelError && <div className="adminSub__alert adminSub__alert--error">{cancelError}</div>}

                          {!cancelError && cancelResult && (
                            <div className="adminSub__alert adminSub__alert--success">
                              {cancelResult.ok ? "Abonnement résilié. Votre organisation est repassée en Free." : "Résiliation lancée mais pas encore synchronisée côté DB."}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="adminSub__footNote">
                {plan === "free" && <>Upgrade vers Starter ou Pro via Mollie.</>}
                {plan === "starter" && <>Upgrade vers Pro via Mollie.</>}
                {plan === "pro" && <>Vous pouvez résilier à tout moment.</>}
              </div>
            </CardBody>
          </Card>
        </>
      )}

      {tab === "invoices" && <InvoicesTab orgId={orgId} />}

      {tab === "billing" && (
        <BillingTab
          key={`${orgId}:${billingKey}`}
          mode={pendingPlan ? "required" : "edit"}
          orgId={orgId}
          initial={billingGet.billing ?? null}
          loading={billingGet.loading || billingUpsert.loading}
          error={billingGet.error || billingUpsert.error}
          onSave={async (patch) => {
            const updated = await billingUpsert.upsertOrganizationBilling(patch);
            if (!updated) return;

            await billingGet.fetchBilling(orgId);
            setBillingKey((k) => k + 1);

            const planToContinue = pendingPlan;
            setPendingPlan(null);

            if (planToContinue && canStartSubscription(planToContinue)) {
              const res = await startSubscription({ orgId, plan: planToContinue });

              if (!res) {
                showToast({ title: "Impossible de démarrer l’abonnement", description: "Réessayez dans quelques instants.", variant: "error", duration: 6000 });
                return;
              }

              if (!res.ok) {
                showToast({ title: "Erreur de paiement", description: "La demande a échoué. Vérifiez vos infos et réessayez.", variant: "error", duration: 6000 });
                return;
              }

              if ("action" in res && res.action === "checkout") {
                showToast({ title: "Redirection vers Mollie", description: "Finalisez le paiement, puis revenez sur cette page.", variant: "info", duration: 4000 });
                window.location.href = res.checkoutUrl;
                return;
              }

              if ("action" in res && res.action === "sub_created") {
                await refetch();
                showToast({ title: "Plan mis à jour", description: "Votre abonnement a été mis à jour.", variant: "success", duration: 4500 });
                return;
              }

              return;
            }

            showToast({ title: "Facturation enregistrée", description: "Vos informations de facturation ont été mises à jour.", variant: "success", duration: 4500 });
          }}
        />
      )}
      </div>
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
  badgeLabel,
  actionLabelOverride,
  helperOverride,
  buttonVariant,
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
  badgeLabel?: string;
  actionLabelOverride?: string;
  helperOverride?: string;
  buttonVariant?: "primary" | "secondary" | "danger";
}) {
  const defaultActionLabel = kind === "up" ? `Passer à ${title}` : `Redescendre à ${title}`;
  const actionLabel = actionLabelOverride ?? defaultActionLabel;

  const helper =
    helperOverride ??
    (kind === "up" ? "Vous garderez l’accès immédiatement après confirmation." : "Attention : baisse des limites et fonctionnalités.");

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
          <Badge>{badgeLabel ?? (kind === "up" ? "Upgrade" : "Downgrade")}</Badge>
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
        <Button variant={buttonVariant} disabled={!isEnabled} className="adminSub__fullWidthBtn" onClick={onAction}>
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
    <button onClick={onClick} className={active ? "adminEventTab isActive" : "adminEventTab"} type="button">
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* BillingTab                                                         */
/* ------------------------------------------------------------------ */

function BillingTab(props: {
  mode: "required" | "edit";
  orgId: string;
  initial: OrganizationBilling | null;
  loading: boolean;
  error: string | null;
  onSave: (patch: OrganizationBillingPatch) => Promise<void>;
}) {
  const { mode, orgId, initial, loading, error, onSave } = props;

  function makeInitialForm(initial: OrganizationBilling | null) {
    return {
      legalName: initial?.legalName ?? "",
      vatCountryLabel: countryCodeToLabel(initial?.vatCountryCode),
      vatNumber: initial?.vatNumber ?? "",

      addressLine1: initial?.addressLine1 ?? "",
      addressLine2: initial?.addressLine2 ?? "",
      postalCode: initial?.postalCode ?? "",
      city: initial?.city ?? "",
      countryLabel: countryCodeToLabel(initial?.countryCode) || "Belgique",

      billingEmail: initial?.billingEmail ?? "",
      invoiceReference: initial?.invoiceReference ?? "",
    };
  }

  const [form, setForm] = useState(() => makeInitialForm(initial));
  const [isVatSubject, setIsVatSubject] = useState(() => Boolean(initial?.vatCountryCode || initial?.vatNumber));

  // ✅ évite d’écraser le form si l’utilisateur a déjà commencé à modifier
  const [isDirty, setIsDirty] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setIsDirty(true);
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // ✅ resync quand `initial` arrive / change (fetch async) sans warning “cascading renders”
  const lastInitRef = useRef<string>("");

  useEffect(() => {
    if (!initial) return;
    if (isDirty) return;

    const sig = JSON.stringify({
      legalName: initial.legalName ?? "",
      vatCountryCode: initial.vatCountryCode ?? "",
      vatNumber: initial.vatNumber ?? "",
      addressLine1: initial.addressLine1 ?? "",
      addressLine2: initial.addressLine2 ?? "",
      postalCode: initial.postalCode ?? "",
      city: initial.city ?? "",
      countryCode: initial.countryCode ?? "",
      billingEmail: initial.billingEmail ?? "",
      invoiceReference: initial.invoiceReference ?? "",
    });

    if (sig === lastInitRef.current) return;
    lastInitRef.current = sig;

    // microtask => évite le warning React (setState sync dans effect)
    queueMicrotask(() => {
      setForm(makeInitialForm(initial));
      setIsVatSubject(Boolean(initial.vatCountryCode || initial.vatNumber));
      setIsDirty(false);
    });
  }, [initial, isDirty]);

  const vatCountryCode = useMemo(() => {
    const c = inferCountryCode(form.vatCountryLabel);
    return c ? String(c) : null;
  }, [form.vatCountryLabel]);

  const needsVat = isVatSubject;

  const title = mode === "required" ? "Infos de facturation requises" : "Infos de facturation";
  const subtitle =
    mode === "required"
      ? "Avant de souscrire, on a besoin de ces informations pour générer vos factures."
      : "Consultez et modifiez les informations utilisées sur vos factures.";

  const canSave = useMemo(() => {
    const baseOk =
      t(form.legalName).length >= 2 &&
      t(form.addressLine1).length >= 2 &&
      t(form.postalCode).length >= 2 &&
      t(form.city).length >= 2;

    const vatOk = !needsVat || (t(form.vatCountryLabel).length >= 2 && t(form.vatNumber).length >= 6);

    return baseOk && vatOk;
  }, [form.legalName, form.addressLine1, form.postalCode, form.city, form.vatCountryLabel, form.vatNumber, needsVat]);

  async function submit() {
    if (!canSave) return;

    const patch: OrganizationBillingPatch = {
      orgId,
      legalName: t(form.legalName),

      vatCountryCode: needsVat ? vatCountryCode : null,
      vatNumber: needsVat ? toNullIfEmpty(form.vatNumber) : null,

      addressLine1: t(form.addressLine1),
      addressLine2: toNullIfEmpty(form.addressLine2),

      postalCode: t(form.postalCode),
      city: t(form.city),

      countryCode: inferCountryCode(form.countryLabel),

      billingEmail: toNullIfEmpty(form.billingEmail),
      invoiceReference: toNullIfEmpty(form.invoiceReference),
    };

    await onSave(patch);

    // ✅ après save ok, on considère “propre”
    setIsDirty(false);
  }

  return (
    <Card>
      <CardHeader title={title} subtitle={subtitle} />
      <CardBody>
        {error ? <div className="adminSub__alert adminSub__alert--error billingTab__error">{error}</div> : null}

        <div className="billingTabGrid">
          <div className="billingTabSpan2">
            <Input
              label="Raison sociale"
              value={form.legalName}
              onChange={(e) => set("legalName", e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="billingTabSpan2">
            <label className="billingTabCheckbox">
              <input
                type="checkbox"
                checked={isVatSubject}
                onChange={(e) => {
                  const next = e.target.checked;
                  setIsVatSubject(next);
                  setIsDirty(true);

                  if (!next) {
                    setForm((prev) => ({ ...prev, vatCountryLabel: "", vatNumber: "" }));
                  }
                }}
                disabled={loading}
              />
              <span>Assujetti à la TVA</span>
            </label>
          </div>

          {isVatSubject ? (
            <>
              <div>
                <CountrySelect
                  label="Pays TVA"
                  value={form.vatCountryLabel}
                  onChange={(v) => set("vatCountryLabel", v || "")}
                  required
                />
              </div>

              <div>
                <Input
                  label="Numéro TVA"
                  placeholder="Ex: BE0123456789"
                  value={form.vatNumber}
                  onChange={(e) => set("vatNumber", e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </>
          ) : null}

          <div className="billingTabSpan2">
            <Input
              label="Adresse"
              placeholder="Rue, numéro"
              value={form.addressLine1}
              onChange={(e) => set("addressLine1", e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="billingTabSpan2">
            <Input
              label="Complément d'adresse (optionnel)"
              placeholder="Boîte, étage…"
              value={form.addressLine2}
              onChange={(e) => set("addressLine2", e.target.value)}
              disabled={loading}
            />
          </div>

          <div>
            <Input
              label="Code postal"
              placeholder="Ex: 5000"
              value={form.postalCode}
              onChange={(e) => set("postalCode", e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div>
            <Input
              label="Ville"
              placeholder="Ex: Namur"
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div>
            <CountrySelect
              label="Pays"
              value={form.countryLabel}
              onChange={(v) => set("countryLabel", v || "")}
              required
            />
          </div>

          <div>
            <Input
              label="Email de facturation (optionnel)"
              placeholder="facturation@…"
              value={form.billingEmail}
              onChange={(e) => set("billingEmail", e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="billingTabSpan2">
            <Input
              label="Référence facture (optionnel)"
              placeholder="Ex: Projet / PO / référence interne…"
              value={form.invoiceReference}
              onChange={(e) => set("invoiceReference", e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        <div className="billingTabActions">
          <Button variant="primary" disabled={loading || !canSave} onClick={submit}>
            {loading ? "Sauvegarde…" : "Sauvegarder"}
          </Button>

          {mode === "required" ? <div className="billingTabHint">Ces infos seront utilisées pour vos factures EventFlow.</div> : null}
        </div>

        <div className="billingTabFoot">Vous pourrez modifier ces informations à tout moment.</div>
      </CardBody>
    </Card>
  );
}