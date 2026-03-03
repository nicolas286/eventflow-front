import { useEffect, useMemo, useState } from "react";

import { Button, Input, Badge } from "@shared/ui/components";
import CountrySelect from "@shared/ui/components/inputs/CountrySelect";

import type { OrganizationBilling, 
  OrganizationBillingPatch } from "@shared/models/db/db.organizationBilling.schema";
import { inferCountryCode } from "@helpers/countries";

function t(v: string) {
  return v.trim();
}
function toNullIfEmpty(v: string): string | null {
  const s = t(v);
  return s ? s : null;
}

type Props = {
  mode: "required" | "edit";
  orgId: string;

  // billing already fetched, can be null
  initial: OrganizationBilling | null;

  loading: boolean;
  error: string | null;

  onClose: () => void;
  onSave: (patch: OrganizationBillingPatch) => Promise<void>;
};

export default function BillingModal(props: Props) {
  const { mode, orgId, initial, loading, error, onClose, onSave } = props;

  // UI form state (CountrySelect uses labels)
  const [form, setForm] = useState({
    legalName: "",
    vatCountryLabel: "Belgique",
    vatNumber: "",

    addressLine1: "",
    addressLine2: "",
    postalCode: "",
    city: "",
    countryLabel: "Belgique",

    billingEmail: "",
    invoiceReference: "",
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // Sync when initial changes (edit mode or after fetch)
  useEffect(() => {
    if (!initial) return;

    setForm({
      legalName: initial.legalName ?? "",
      vatCountryLabel: initial.vatCountryCode ? initial.vatCountryCode : "Belgique",
      vatNumber: initial.vatNumber ?? "",

      addressLine1: initial.addressLine1 ?? "",
      addressLine2: initial.addressLine2 ?? "",
      postalCode: initial.postalCode ?? "",
      city: initial.city ?? "",
      countryLabel: initial.countryCode ? initial.countryCode : "Belgique",

      billingEmail: initial.billingEmail ?? "",
      invoiceReference: initial.invoiceReference ?? "",
    });
  }, [initial]);

  const title = mode === "required" ? "Infos de facturation requises" : "Infos de facturation";
  const subtitle =
    mode === "required"
      ? "Avant de souscrire, on a besoin de ces informations pour générer vos factures."
      : "Consultez et modifiez les informations utilisées sur vos factures.";

  const canSave = useMemo(() => {
    return t(form.legalName).length >= 2 && t(form.addressLine1).length >= 2 && t(form.postalCode).length >= 2 && t(form.city).length >= 2;
  }, [form.legalName, form.addressLine1, form.postalCode, form.city]);

  async function submit() {
    if (!canSave) return;

    const patch: OrganizationBillingPatch = {
      orgId,

      legalName: t(form.legalName),

      // v1: confiance (pas de validation TVA côté back)
      vatCountryCode: toNullIfEmpty(String(inferCountryCode(form.vatCountryLabel) ?? "")),
      vatNumber: toNullIfEmpty(form.vatNumber),

      addressLine1: t(form.addressLine1),
      addressLine2: toNullIfEmpty(form.addressLine2),

      postalCode: t(form.postalCode),
      city: t(form.city),

      countryCode: inferCountryCode(form.countryLabel),

      billingEmail: toNullIfEmpty(form.billingEmail),
      invoiceReference: toNullIfEmpty(form.invoiceReference),
    };

    await onSave(patch);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: 12,
        zIndex: 9999,
      }}
      onClick={() => !loading && onClose()}
    >
      <div
        style={{
          width: "min(720px, 100%)",
          maxHeight: "min(86vh, 760px)", // ✅ laptop safe
          background: "white",
          borderRadius: 14,
          border: "1px solid #e5e7eb",
          boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
          overflow: "hidden", // important: header + scroll body
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (sticky) */}
        <div
          style={{
            padding: 14,
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
            alignItems: "flex-start",
            background: "white",
          }}
        >
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ fontSize: 16, fontWeight: 800 }}>{title}</div>
              {mode === "required" ? <Badge tone="warn" label="Obligatoire" /> : <Badge tone="info" label="Profil" />}
            </div>

            <div style={{ fontSize: 13, color: "#6b7280" }}>{subtitle}</div>
          </div>

          <Button variant="secondary" label="Fermer" onClick={onClose} disabled={loading} />
        </div>

        {/* Body scrollable */}
        <div
          style={{
            padding: 14,
            overflowY: "auto",
            maxHeight: "calc(min(86vh, 760px) - 64px)", // header height approx
          }}
        >
          {error ? (
            <div
              style={{
                marginBottom: 12,
                padding: "10px 12px",
                border: "1px solid #fecaca",
                background: "#fef2f2",
                borderRadius: 10,
                color: "#991b1b",
                fontSize: 14,
              }}
            >
              {error}
            </div>
          ) : null}

          {/* Responsive grid: 2 cols on desktop, 1 col on small */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <div style={{ gridColumn: "1 / -1" }}>
              <Input
                label="Raison sociale"
                placeholder="Ex: Maison des Jeunes de…"
                value={form.legalName}
                onChange={(e) => set("legalName", e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div>
              <CountrySelect
                label="Pays TVA (optionnel)"
                value={form.vatCountryLabel}
                onChange={(v) => set("vatCountryLabel", v || "")}
                required={false}
              />
            </div>

            <div>
              <Input
                label="Numéro TVA (optionnel)"
                placeholder="Ex: BE0123456789"
                value={form.vatNumber}
                onChange={(e) => set("vatNumber", e.target.value)}
                disabled={loading}
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <Input
                label="Adresse"
                placeholder="Rue, numéro"
                value={form.addressLine1}
                onChange={(e) => set("addressLine1", e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
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

            <div style={{ gridColumn: "1 / -1" }}>
              <Input
                label="Référence facture (optionnel)"
                placeholder="Ex: Projet / PO / référence interne…"
                value={form.invoiceReference}
                onChange={(e) => set("invoiceReference", e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div style={{ height: 12 }} />

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Button
              variant="primary"
              label={loading ? "Enregistrement…" : "Enregistrer"}
              onClick={submit}
              disabled={loading || !canSave}
            />

            {mode === "required" ? (
              <div style={{ fontSize: 12, color: "#6b7280", alignSelf: "center" }}>
                Ces infos seront utilisées pour vos factures EventFlow.
              </div>
            ) : null}
          </div>

          <div style={{ marginTop: 10, fontSize: 12, color: "#9ca3af" }}>
            Vous pourrez modifier ces informations à tout moment.
          </div>
        </div>

        {/* Mobile tweak: force 1 column */}
        <style>{`
          @media (max-width: 640px) {
            .billingModalGrid {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
