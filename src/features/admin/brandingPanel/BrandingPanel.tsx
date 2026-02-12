import "../../../styles/desktop/brandingPanel.desktop.css";
import "../../../styles/mobile/brandingPanel.mobile.css";

import { useEffect, useMemo, useState } from "react";

import { Button, Input, Badge } from "../../../ui/components";
import { MessageBox } from "../../../ui/components/message/MessageBox";
import { useLiveForm } from "../../public/useLiveZodForm";

import { applyOrgTheme } from "../../theme/applyOrgTheme";
import { supabase } from "../../../gateways/supabase/supabaseClient";
import { useSaveOrgBranding } from "../../admin/hooks/useSaveOrgBranding";
import {
  orgBrandingFormSchema,
  type OrgBrandingUI,
  type OrgBrandingForm,
} from "../../../domain/models/admin/admin.orgBranding.schema";
import { handleSaveBranding } from "./handleSaveBranding";

import { AssetUploader } from "../../../ui/components/inputs/AssetUploader";
import { normalizeError } from "../../../domain/errors/errors";

type BrandingPanelProps = {
  orgId: string;
  org: OrgBrandingUI;
  setOrg: React.Dispatch<React.SetStateAction<OrgBrandingUI>>;
  onSaved: () => Promise<void>;
};

export default function BrandingPanel({ orgId, org, setOrg, onSaved }: BrandingPanelProps) {
  const { loading, error, updated, previewLogoUrl, previewBannerUrl, saveOrgBranding, reset } =
    useSaveOrgBranding({ supabase });

  const live = useLiveForm<OrgBrandingForm>(orgBrandingFormSchema, {
    displayName: org.displayName ?? "",
    primaryColor: org.primaryColor ?? "",
    logoUrl: org.logoUrl ?? null,
    defaultEventBannerUrl: org.defaultEventBannerUrl ?? null,
  });

  const { form, fieldErrors, handleChange, handleBlur, shouldShowFieldError } = live;

  const [assetError, setAssetError] = useState<string | null>(null);

  useEffect(() => {
    applyOrgTheme(org.primaryColor || "#2563eb");
  }, [org.primaryColor]);

  // Resync live form si org change depuis l'extérieur
  useEffect(() => {
    handleChange("displayName", org.displayName ?? "");
    handleChange("primaryColor", org.primaryColor ?? "");
    handleChange("logoUrl", org.logoUrl ?? null);
    handleChange("defaultEventBannerUrl", org.defaultEventBannerUrl ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org.displayName, org.primaryColor, org.logoUrl, org.defaultEventBannerUrl]);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [localLogoPreview, setLocalLogoPreview] = useState<string | null>(null);
  const [localBannerPreview, setLocalBannerPreview] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (localLogoPreview) URL.revokeObjectURL(localLogoPreview);
      if (localBannerPreview) URL.revokeObjectURL(localBannerPreview);
    };
  }, [localLogoPreview, localBannerPreview]);

  const effectiveLogoPreview = useMemo(() => {
    return previewLogoUrl ?? localLogoPreview ?? org.logoUrl ?? "";
  }, [previewLogoUrl, localLogoPreview, org.logoUrl]);

  const effectiveBannerPreview = useMemo(() => {
    return previewBannerUrl ?? localBannerPreview ?? org.defaultEventBannerUrl ?? "";
  }, [previewBannerUrl, localBannerPreview, org.defaultEventBannerUrl]);

  async function handleSave() {
    setAssetError(null);

    // ✅ force l'affichage des erreurs si invalid
    live.touchAll(["displayName", "primaryColor"]);

    const parsed = live.validateAll();
    if (!parsed.ok) return;

    try {
      await handleSaveBranding({
        orgId,
        form: {
          displayName: parsed.data.displayName,
          primaryColor: parsed.data.primaryColor,
          logoUrl: parsed.data.logoUrl ?? null,
          defaultEventBannerUrl: parsed.data.defaultEventBannerUrl ?? null,
        },
        logoFile,
        bannerFile,
        saveOrgBranding,
        onSaved,
        reset,
        clearLogo: () => {
          setLogoFile(null);
          if (localLogoPreview) {
            URL.revokeObjectURL(localLogoPreview);
            setLocalLogoPreview(null);
          }
        },
        clearBanner: () => {
          setBannerFile(null);
          if (localBannerPreview) {
            URL.revokeObjectURL(localBannerPreview);
            setLocalBannerPreview(null);
          }
        },
      });
    } catch (e) {
      const err = normalizeError(e, "Erreur inconnue.");
      setAssetError(err.message);
    }
  }

  return (
    <div className="brandingPanel">
      {/* Ligne 1 : nom + preview */}
      <div className="brandingPanel__grid2">
        <div>
          <Input
            label="Nom affiché"
            value={form.displayName}
            onChange={(e) => {
              setAssetError(null);
              handleChange("displayName", e.target.value);
              setOrg((o) => ({ ...o, displayName: e.target.value }));
            }}
            onBlur={() => handleBlur("displayName")}
          />

          {shouldShowFieldError("displayName") && fieldErrors.displayName ? (
            <MessageBox variant="error">{fieldErrors.displayName}</MessageBox>
          ) : null}
        </div>

        <div className="brandingPanel__previewCard">
          <div className="brandingPanel__labelRow">
            <div className="brandingPanel__label">Aperçu</div>
            <Badge tone="info" label="Live" />
          </div>

          <div className="brandingPanel__preview">
            <Button variant="primary" label="Action primaire" />
            <Button variant="secondary" label="Secondaire" />
            <Button variant="ghost" label="Ghost" />
          </div>
        </div>
      </div>

      {/* Ligne 2 : couleur */}
      <div>
        <div className="brandingPanel__label">Couleur principale</div>
        <div className="brandingPanel__row">
          <Input
            type="color"
            value={form.primaryColor ?? ""}
            onChange={(e) => {
              setAssetError(null);
              handleChange("primaryColor", e.target.value);
              setOrg((o) => ({ ...o, primaryColor: e.target.value }));
            }}
            onBlur={() => handleBlur("primaryColor")}
            className="brandingPanel__color"
            aria-label="Choisir une couleur"
          />

          <Input
            value={form.primaryColor ?? ""}
            onChange={(e) => {
              setAssetError(null);
              handleChange("primaryColor", e.target.value);
              setOrg((o) => ({ ...o, primaryColor: e.target.value }));
            }}
            onBlur={() => handleBlur("primaryColor")}
            placeholder="#2563eb"
          />

          <div className="brandingPanel__chip" title="Couleur actuelle">
            <span className="brandingPanel__chipDot" />
            <span>{form.primaryColor || "#2563eb"}</span>
          </div>
        </div>

        {shouldShowFieldError("primaryColor") && fieldErrors.primaryColor ? (
          <MessageBox variant="error">{fieldErrors.primaryColor}</MessageBox>
        ) : null}
      </div>

      {/* Assets */}
      <div className="brandingPanel__grid2">
        <AssetUploader
          label="Logo"
          hint="PNG/JPG/WebP · max 2MB"
          valueUrl={org.logoUrl ?? ""}
          previewUrl={effectiveLogoPreview}
          accept="image/*"
          maxBytes={2 * 1024 * 1024}
          maxLabel="2MB"
          variant="logo"
          onError={(msg) => setAssetError(msg)}
          onPickFile={(file) => {
            setAssetError(null);
            setLogoFile(file);

            if (localLogoPreview) URL.revokeObjectURL(localLogoPreview);
            setLocalLogoPreview(URL.createObjectURL(file));
          }}
          onClear={() => {
            setAssetError(null);
            setLogoFile(null);
            if (localLogoPreview) URL.revokeObjectURL(localLogoPreview);
            setLocalLogoPreview(null);

            handleChange("logoUrl", null);
            setOrg((o) => ({ ...o, logoUrl: "" }));
          }}
        />

        <AssetUploader
          label="Bannière par défaut"
          hint="Recommandé: large (ex: 1600×600) · max 4MB"
          valueUrl={org.defaultEventBannerUrl ?? ""}
          previewUrl={effectiveBannerPreview}
          accept="image/*"
          maxBytes={4 * 1024 * 1024}
          maxLabel="4MB"
          variant="banner"
          onError={(msg) => setAssetError(msg)}
          onPickFile={(file) => {
            setAssetError(null);
            setBannerFile(file);

            if (localBannerPreview) URL.revokeObjectURL(localBannerPreview);
            setLocalBannerPreview(URL.createObjectURL(file));
          }}
          onClear={() => {
            setAssetError(null);
            setBannerFile(null);
            if (localBannerPreview) URL.revokeObjectURL(localBannerPreview);
            setLocalBannerPreview(null);

            handleChange("defaultEventBannerUrl", null);
            setOrg((o) => ({ ...o, defaultEventBannerUrl: "" }));
          }}
        />
      </div>

      {/* Status */}
      {(assetError || error) && (
        <div className="brandingPanel__status">
          {assetError ? <MessageBox variant="error">{assetError}</MessageBox> : null}
          {error ? <MessageBox variant="error">{error}</MessageBox> : null}
        </div>
      )}

      {updated ? (
        <div className="brandingPanel__status">
          <MessageBox variant="success">Branding sauvegardé</MessageBox>
        </div>
      ) : null}

      {/* Actions */}
      <div className="brandingPanel__actionsBar">
        <div className="brandingPanel__actions">
          <Button
            variant="primary"
            label={loading ? "Sauvegarde…" : "Sauvegarder"}
            onClick={handleSave}
            disabled={loading}
          />
        </div>
      </div>
    </div>
  );
}
