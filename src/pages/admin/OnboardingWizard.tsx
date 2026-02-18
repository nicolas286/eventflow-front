import { useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";

import "../../styles/desktop/OnboardingWizard.desktop.css";

import type { AdminOutletContext } from "../admin/AdminDashboard";
import { supabase } from "../../gateways/supabase/supabaseClient";

import { useSaveAdminProfile } from "../../features/admin/hooks/useUpdateAdminProfile";
import { useCreateOrganization } from "../../features/admin/hooks/useCreateOrganization";

import type { AdminProfileForm } from "../../domain/models/admin/admin.updateAdminProfile.schema";
import type { CreateOrganizationForm } from "../../domain/models/admin/admin.createOrganization.schema";

import { inferCountryCode } from "../../domain/helpers/countries";
import { Button, Input, Badge, Select } from "../../ui/components";

import CountrySelect from "../../ui/components/forms/CountrySelect";
import PhoneInput from "../../ui/components/forms/PhoneInput";
import { parseE164, buildE164 } from "../../ui/components/forms/countryPhoneData";

type WizardForm = {
  firstName: string;
  lastName: string;

  // UI
  phone: string; // E164 (ou "")
  countryLabel: string; // "Belgique"

  // org
  orgType: CreateOrganizationForm["type"];
  orgName: string;
};

function t(v: string) {
  return v.trim();
}
function toNullIfEmpty(v: string): string | null {
  const s = t(v);
  return s ? s : null;
}

export default function OnboardingWizard() {
  const navigate = useNavigate();
  const { bootstrap, refetch } = useOutletContext<AdminOutletContext>();

  const userId = bootstrap?.profile?.userId ?? null;

  const [step, setStep] = useState(1);

  const [form, setForm] = useState<WizardForm>({
    firstName: "",
    lastName: "",
    phone: "",
    countryLabel: "",
    orgType: "association",
    orgName: "",
  });

  const saveProfile = useSaveAdminProfile({ supabase });
  const createOrg = useCreateOrganization({ supabase });

  const loading = saveProfile.loading || createOrg.loading;
  const error = saveProfile.error || createOrg.error;

  function set<K extends keyof WizardForm>(key: K, value: WizardForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const canGoNext = useMemo(() => {
    if (step === 1) {
      return t(form.firstName).length >= 2 && t(form.lastName).length >= 2;
    }
    if (step === 2) {
      return t(form.orgName).length >= 3;
    }
    return true;
  }, [step, form.firstName, form.lastName, form.orgName]);

  async function onSubmitFinal() {
    if (!userId) return;

    // téléphone => e164 clean (sans espaces)
    const p = parseE164(form.phone || null);
    const phoneE164 = buildE164(p.dial || "+32", p.national);

    // 1) profile
    const profileForm: AdminProfileForm = {
      userId,
      firstName: toNullIfEmpty(form.firstName),
      lastName: toNullIfEmpty(form.lastName),
      phone: phoneE164 || null,

      addressLine1: null,
      addressLine2: null,
      postalCode: null,
      city: null,

      countryCode: inferCountryCode(form.countryLabel),
    };

    const saved = await saveProfile.saveAdminProfile({
      userId,
      form: profileForm,
    });
    if (!saved) return;

    // 2) org
    const createdOrgId = await createOrg.createOrganization({
      type: form.orgType,
      name: t(form.orgName),
    });
    if (!createdOrgId) return;

    // 3) refresh + redirect
    await refetch();
    navigate("/admin");
  }

  return (
    <div className="onboardingPage">
      <div className="onboardingCard">
        <div className="onboardingHeader">
          <div>
            <h1>Bienvenue sur EventFlow</h1>
            <p>Votre organisation est créée. Organisez votre premier événement !</p>
          </div>

        </div>

        {error ? <div className="onboardingError">{error}</div> : null}

        {/* -------------------- STEP 1 -------------------- */}
        {step === 1 && (
          <div className="onboardingStep">
            <div className="onboardingStep__titleRow">
              <h2>Votre profil</h2>
            </div>

            <div className="onboardingGrid2">
              <Input
                label="Prénom"
                placeholder="Votre prénom"
                value={form.firstName}
                onChange={(e) => set("firstName", e.target.value)}
                disabled={loading}
                required
              />

              <Input
                label="Nom"
                placeholder="Votre nom"
                value={form.lastName}
                onChange={(e) => set("lastName", e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="onboardingGrid2">
              {/* Téléphone */}
              <div>
                <PhoneInput
                  label="Téléphone (optionnel)"
                  value={form.phone}
                  onChange={(v) => set("phone", v)}
                  required={false}
                />
              </div>

              {/* Pays */}
              <div>
                <CountrySelect
                  label="Pays"
                  value={form.countryLabel}
                  onChange={(v) => set("countryLabel", v || "")}
                  required
                />
              </div>
            </div>

          
          </div>
        )}

        {/* -------------------- STEP 2 -------------------- */}
        {step === 2 && (
          <div className="onboardingStep">
            <div className="onboardingStep__titleRow">
              <h2>Votre organisation</h2>
              <Badge tone="info" label="Création" />
            </div>

            <div className="onboardingRow">
              <Select label="Type">
                <option key="Personne physique" value="person">
                        Personne physique
                </option>
                <option key="Personne morale" value="association">
                        Personne morale
                </option>
              </Select>
            </div>

            <Input
              label="Nom de l’organisation"
              placeholder="Ex: Maison des Jeunes de…"
              value={form.orgName}
              onChange={(e) => set("orgName", e.target.value)}
              disabled={loading}
            />
          </div>
        )}


        {/* -------------------- ACTIONS -------------------- */}
        <div className="onboardingActionsBar">
          <div className="onboardingStatus">
            {!userId ? <div className="onboardingError">Utilisateur non chargé (bootstrap incomplet)</div> : null}
          </div>

          <div className="onboardingActions">
            {step > 1 ? (
              <Button
                variant="secondary"
                label="Précédent"
                onClick={() => setStep((s) => s - 1)}
                disabled={loading}
              />
            ) : null}

            {step < 3 ? (
              <Button
                variant="primary"
                label="Suivant"
                onClick={() => setStep((s) => s + 1)}
                disabled={loading || !canGoNext}
              />
            ) : (
              <Button
                variant="primary"
                label={loading ? "Création…" : "Terminer"}
                onClick={onSubmitFinal}
                disabled={loading || !canGoNext || !userId}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
