import { useMemo, useState } from "react";
import "../../../styles/profilePanel.css";

import { Button, Input, Badge } from "../../../ui/components";
import { supabase } from "../../../gateways/supabase/supabaseClient";

import { useSaveAdminProfile } from "../hooks/useUpdateAdminProfile";
import type { AdminProfileForm } from "../../../domain/models/admin/admin.updateAdminProfile.schema";
import { inferCountryCode } from "../../../domain/helpers/countries";

/* ✅ factorisé */
import CountrySelect from "../../../ui/components/forms/CountrySelect";
import PhoneInput from "../../../ui/components/forms/PhoneInput";
import { parseE164, buildE164 } from "../../../ui/components/forms/countryPhoneData";

type ProfilePanelProps = {
  profile: AdminProfileForm;
  setProfile: React.Dispatch<React.SetStateAction<AdminProfileForm>>;
  onSaved: () => Promise<void>;
};

export default function ProfilePanel({ profile, setProfile, onSaved }: ProfilePanelProps) {
  const { loading, error, updated, saveAdminProfile, reset } = useSaveAdminProfile({ supabase });

  function updateField<K extends keyof AdminProfileForm>(key: K, value: AdminProfileForm[K]) {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }

  const displayName = useMemo(() => {
    const fn = (profile.firstName ?? "").trim();
    const ln = (profile.lastName ?? "").trim();
    const name = `${fn} ${ln}`.trim();
    return name || "Compte admin";
  }, [profile.firstName, profile.lastName]);

  // "Compte" (Auth) — UI only pour l’instant
  const [email, setEmail] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");

  async function handleSave() {
    reset();

    // ⚠️ inchangé : on construit bien une valeur e164 sans espaces
    const p = parseE164(profile.phone);
    const phoneE164 = buildE164(p.dial || "+32", p.national);

    const next: AdminProfileForm = {
      ...profile,
      phone: phoneE164 || null,
    };

    const res = await saveAdminProfile({
      userId: next.userId,
      form: next,
    });

    if (!res) return;

    setProfile(res);
    await onSaved();
  }

  const selectedCountry = useMemo(() => {
    const c = (profile.country ?? "").trim().toLowerCase();
    if (!c) return "";
    return profile.country ?? "";
  }, [profile.country]);

  return (
    <div className="profilePanel">
      {/* Head */}
      <div className="profilePanel__head">
        <div className="profilePanel__headLeft">
          <div className="profilePanel__titleRow">
            <div className="profilePanel__title">Informations personnelles</div>
            <Badge tone="info" label="Privé" />
          </div>
          <div className="profilePanel__subtitle">
            Ces informations sont utilisées pour votre gestion interne (contact, facturation, etc.).
          </div>
        </div>

        <div className="profilePanel__headRight">
          <div className="profilePanel__chip" title="Nom complet">
            <span className="profilePanel__chipDot" />
            <span>{displayName}</span>
          </div>
        </div>
      </div>

      {/* Nom */}
      <div className="profilePanel__grid2">
        <Input
          label="Prénom"
          value={profile.firstName ?? ""}
          onChange={(e) => updateField("firstName", e.target.value)}
          placeholder="Votre prénom"
        />
        <Input
          label="Nom"
          value={profile.lastName ?? ""}
          onChange={(e) => updateField("lastName", e.target.value)}
          placeholder="Votre nom"
        />
      </div>

      {/* Contact */}
      <div className="profilePanel__grid2">
        {/* Téléphone */}
        <div className="profilePanel__phone">
          <div className="profilePanel__label">Téléphone</div>

          {/* ✅ même structure visuelle, mais logique factorisée */}
          <PhoneInput
            value={profile.phone}
            onChange={(next) => {
              updateField("phone", next ? next : null);
            }}
            groupClassName="profilePanel__phoneRow"
            selectClassName="profilePanel__select"
            inputClassName="profilePanel__phoneInput"
            defaultDial="+32"
          />
        </div>

        {/* Pays */}
        <div className="profilePanel__country">
          <div className="profilePanel__label">Pays</div>

          <CountrySelect
            className="profilePanel__select"
            value={selectedCountry}
            onChange={(countryLabel) => {
              updateField("country", countryLabel || null);
              updateField("countryCode", inferCountryCode(countryLabel));
            }}
            placeholder="Sélectionner un pays"
          />
        </div>
      </div>

      {/* Adresse */}
      <div className="profilePanel__section">
        <div className="profilePanel__sectionTitle">Adresse</div>

        <Input
          label="Adresse (ligne 1)"
          value={profile.addressLine1 ?? ""}
          onChange={(e) => updateField("addressLine1", e.target.value)}
          placeholder="Rue et numéro"
        />

        <Input
          label="Adresse (ligne 2)"
          value={profile.addressLine2 ?? ""}
          onChange={(e) => updateField("addressLine2", e.target.value)}
          placeholder="Boîte, étage, complément"
        />

        <div className="profilePanel__grid2">
          <Input
            label="Code postal"
            value={profile.postalCode ?? ""}
            onChange={(e) => updateField("postalCode", e.target.value)}
            placeholder="Code postal"
          />
          <Input
            label="Ville"
            value={profile.city ?? ""}
            onChange={(e) => updateField("city", e.target.value)}
            placeholder="Ville"
          />
        </div>
      </div>

      {/* Compte (Auth) — UI only */}
      <div className="profilePanel__section">
        <div className="profilePanel__sectionHead">
          <div className="profilePanel__sectionTitle">Compte</div>
          <Badge tone="warning" label="Bientôt" />
        </div>

        <div className="profilePanel__grid2">
          <Input
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@exemple.com"
            disabled
          />
          <div />
        </div>

        <div className="profilePanel__grid2">
          <Input
            label="Nouveau mot de passe"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••"
            type="password"
            disabled
          />
          <Input
            label="Confirmer le mot de passe"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            type="password"
            disabled
          />
        </div>

        <div className="profilePanel__hint">
          TODO : modifier l’email et le mot de passe via Supabase Auth (avec re-auth si nécessaire).
        </div>
      </div>

      {/* Actions */}
      <div className="profilePanel__actionsBar">
        <div className="profilePanel__status">
          {error ? <div className="profilePanel__error">{error}</div> : null}
          {updated ? <div className="profilePanel__success">Profil sauvegardé</div> : null}
        </div>

        <div className="profilePanel__actions">
          <Button
            variant="primary"
            label={loading ? "Sauvegarde…" : "Sauvegarder"}
            onClick={handleSave}
            disabled={loading || !profile.userId}
          />
        </div>
      </div>
    </div>
  );
}
