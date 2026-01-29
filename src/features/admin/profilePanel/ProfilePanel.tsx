import { useMemo, useState } from "react";
import "../../../styles/profilePanel.css";

import { Button, Input, Badge } from "../../../ui/components";
import { supabase } from "../../../gateways/supabase/supabaseClient";

import { useSaveAdminProfile } from "../hooks/useUpdateAdminProfile";
import type { AdminProfileForm } from "../../../domain/models/admin/admin.updateAdminProfile.schema";
import { inferCountryCode } from "../../../domain/helpers/countries";

type ProfilePanelProps = {
  profile: AdminProfileForm;
  setProfile: React.Dispatch<React.SetStateAction<AdminProfileForm>>;
  onSaved: () => Promise<void>;
};

type CountryOption = {
  label: string;
  iso2: string;
  dial: string;
  flag: string;
};

const COUNTRY_OPTIONS: CountryOption[] = [
  { label: "Belgique", iso2: "BE", dial: "+32", flag: "🇧🇪" },
  { label: "France", iso2: "FR", dial: "+33", flag: "🇫🇷" },
  { label: "Luxembourg", iso2: "LU", dial: "+352", flag: "🇱🇺" },
  { label: "Pays-Bas", iso2: "NL", dial: "+31", flag: "🇳🇱" },
  { label: "Allemagne", iso2: "DE", dial: "+49", flag: "🇩🇪" },
  { label: "Suisse", iso2: "CH", dial: "+41", flag: "🇨🇭" },
  { label: "Royaume-Uni", iso2: "GB", dial: "+44", flag: "🇬🇧" },
  { label: "Espagne", iso2: "ES", dial: "+34", flag: "🇪🇸" },
  { label: "Italie", iso2: "IT", dial: "+39", flag: "🇮🇹" },
  { label: "Portugal", iso2: "PT", dial: "+351", flag: "🇵🇹" },
  { label: "Irlande", iso2: "IE", dial: "+353", flag: "🇮🇪" },
  { label: "États-Unis", iso2: "US", dial: "+1", flag: "🇺🇸" },
  { label: "Canada", iso2: "CA", dial: "+1", flag: "🇨🇦" },
];

function normalizeDigits(s: string) {
  return s.replace(/[^\d]/g, "");
}

function parseE164(phoneRaw: string | null | undefined) {
  const p = (phoneRaw ?? "").trim();
  if (!p.startsWith("+")) return { dial: "", national: normalizeDigits(p) };

  const match = COUNTRY_OPTIONS
    .map((c) => c.dial)
    .sort((a, b) => b.length - a.length)
    .find((dial) => p.startsWith(dial));

  if (!match) return { dial: "", national: normalizeDigits(p) };

  const rest = p.slice(match.length);
  return { dial: match, national: normalizeDigits(rest) };
}

function buildE164(dial: string, national: string) {
  const d = (dial ?? "").trim();
  const n = normalizeDigits(national ?? "");
  if (!d && !n) return "";
  if (!d) return n;
  return `${d}${n}`;
}

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

  // Téléphone UI: split indicatif / numéro local
  const initialPhone = useMemo(() => parseE164(profile.phone), [profile.phone]);
  const [dial, setDial] = useState<string>(initialPhone.dial || "+32");
  const [national, setNational] = useState<string>(initialPhone.national);

  // "Compte" (Auth) — UI only pour l’instant
  const [email, setEmail] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");

  // resync soft quand le profil change
  useMemo(() => {
    const p = parseE164(profile.phone);
    if (p.dial) setDial(p.dial);
    setNational(p.national);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.userId]);

  async function handleSave() {
    reset();

    const phoneE164 = buildE164(dial, national);
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
    const found = COUNTRY_OPTIONS.find((o) => o.label.toLowerCase() === c);
    return found?.label ?? profile.country ?? "";
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

          <div className="profilePanel__phoneRow">
            <select
              className="profilePanel__select"
              value={dial}
              onChange={(e) => {
                const nextDial = e.target.value;
                setDial(nextDial);

                const phoneE164 = buildE164(nextDial, national);
                updateField("phone", phoneE164 || null);
              }}
              aria-label="Indicatif"
            >
              {COUNTRY_OPTIONS.map((c) => (
                <option key={`${c.iso2}-${c.dial}`} value={c.dial}>
                  {c.flag} {c.dial}
                </option>
              ))}
            </select>

            <input
              className="profilePanel__phoneInput"
              value={national}
              onChange={(e) => {
                const nextNational = e.target.value;
                setNational(nextNational);

                const phoneE164 = buildE164(dial, nextNational);
                updateField("phone", phoneE164 || null);
              }}
              inputMode="tel"
              placeholder="Numéro"
              aria-label="Numéro de téléphone"
            />
          </div>
        </div>

        {/* Pays */}
        <div className="profilePanel__country">
          <div className="profilePanel__label">Pays</div>

          <select
            className="profilePanel__select"
            value={selectedCountry}
            onChange={(e) => {
              const countryLabel = e.target.value;
              updateField("country", countryLabel || null);

              // conservé côté data (non affiché)
              updateField("countryCode", inferCountryCode(countryLabel));
            }}
            aria-label="Pays"
          >
            <option value="">Sélectionner un pays</option>
            {COUNTRY_OPTIONS.map((c) => (
              <option key={c.iso2} value={c.label}>
                {c.flag} {c.label}
              </option>
            ))}
          </select>
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
