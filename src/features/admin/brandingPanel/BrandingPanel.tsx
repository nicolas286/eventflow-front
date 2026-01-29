// features/admin/brandingPanel/BrandingPanel.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import "../../../styles/brandingPanel.css";
import { Button, Input, Badge } from "../../../ui/components";

import { applyOrgTheme } from "../../theme/applyOrgTheme";
import { supabase } from "../../../gateways/supabase/supabaseClient";
import { useSaveOrgBranding } from "../../admin/hooks/useSaveOrgBranding";

export type Org = {
  name: string;
  primaryColor: string;
  logoUrl?: string;
  defaultEventBannerUrl?: string;
};

type BrandingPanelProps = {
  orgId: string;
  org: Org;
  setOrg: React.Dispatch<React.SetStateAction<Org>>;
  onSaved: () => Promise<void>;
};

export default function BrandingPanel({ orgId, org, setOrg, onSaved }: BrandingPanelProps) {
  const { loading, error, updated, previewLogoUrl, previewBannerUrl, saveOrgBranding, reset } =
    useSaveOrgBranding({ supabase });

  // 🎨 live preview couleur
  useEffect(() => {
    applyOrgTheme(org.primaryColor || "#2563eb");
  }, [org.primaryColor]);

  // fichiers choisis (pas encore upload)
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);

  // preview locaux (objectURL)
  const [localLogoPreview, setLocalLogoPreview] = useState<string | null>(null);
  const [localBannerPreview, setLocalBannerPreview] = useState<string | null>(null);

  // cleanup objectURL
  useEffect(() => {
    return () => {
      if (localLogoPreview) URL.revokeObjectURL(localLogoPreview);
      if (localBannerPreview) URL.revokeObjectURL(localBannerPreview);
    };
  }, [localLogoPreview, localBannerPreview]);

  // si le hook renvoie des preview cache-bust, on les affiche direct
  const effectiveLogoPreview = useMemo(() => {
    return previewLogoUrl ?? localLogoPreview ?? org.logoUrl ?? "";
  }, [previewLogoUrl, localLogoPreview, org.logoUrl]);

  const effectiveBannerPreview = useMemo(() => {
    return previewBannerUrl ?? localBannerPreview ?? org.defaultEventBannerUrl ?? "";
  }, [previewBannerUrl, localBannerPreview, org.defaultEventBannerUrl]);

  async function handleSave() {
    reset();

    const res = await saveOrgBranding({
      orgId,
      form: {
        displayName: org.name,
        primaryColor: org.primaryColor,
        logoUrl: org.logoUrl ?? null,
        defaultEventBannerUrl: org.defaultEventBannerUrl ?? null,
      },
      logoFile,
      bannerFile,
    });

    if (!res) return;
    await onSaved();

    // on considère que les fichiers sont “consommés”
    setLogoFile(null);
    setBannerFile(null);

    // on garde les previews actuelles (hook a déjà cache-bust)
    // et on peut libérer les previews locales si on veut
    if (localLogoPreview) {
      URL.revokeObjectURL(localLogoPreview);
      setLocalLogoPreview(null);
    }
    if (localBannerPreview) {
      URL.revokeObjectURL(localBannerPreview);
      setLocalBannerPreview(null);
    }
  }

  return (
    <div className="brandingPanel">
      {/* Ligne 1 : nom + preview */}
      <div className="brandingPanel__grid2">
        <Input
          label="Nom affiché"
          value={org.name}
          onChange={(e) => setOrg((o) => ({ ...o, name: e.target.value }))}
        />

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
          <input
            type="color"
            value={org.primaryColor}
            onChange={(e) => setOrg((o) => ({ ...o, primaryColor: e.target.value }))}
            className="brandingPanel__color"
            aria-label="Choisir une couleur"
          />

          <Input
            value={org.primaryColor}
            onChange={(e) => setOrg((o) => ({ ...o, primaryColor: e.target.value }))}
            placeholder="#2563eb"
          />

          <div className="brandingPanel__chip" title="Couleur actuelle">
            <span className="brandingPanel__chipDot" />
            <span>{org.primaryColor || "#2563eb"}</span>
          </div>
        </div>
      </div>

      {/* Assets */}
      <div className="brandingPanel__grid2">
        <AssetUploader
          label="Logo"
          hint="PNG/JPG/WebP · max 2MB"
          kind="logo"
          valueUrl={org.logoUrl}
          previewUrl={effectiveLogoPreview}
          onPickFile={(file) => {
            setLogoFile(file);

            if (localLogoPreview) URL.revokeObjectURL(localLogoPreview);
            setLocalLogoPreview(URL.createObjectURL(file));
          }}
          onClear={() => {
            setLogoFile(null);
            if (localLogoPreview) URL.revokeObjectURL(localLogoPreview);
            setLocalLogoPreview(null);

            // si tu veux vraiment retirer en DB, on met "" et le save enverra null/"" selon ton flow
            setOrg((o) => ({ ...o, logoUrl: "" }));
          }}
        />

        <AssetUploader
          label="Bannière par défaut"
          hint="Recommandé: large (ex: 1600×600) · max 4MB"
          kind="banner"
          valueUrl={org.defaultEventBannerUrl}
          previewUrl={effectiveBannerPreview}
          onPickFile={(file) => {
            setBannerFile(file);

            if (localBannerPreview) URL.revokeObjectURL(localBannerPreview);
            setLocalBannerPreview(URL.createObjectURL(file));
          }}
          onClear={() => {
            setBannerFile(null);
            if (localBannerPreview) URL.revokeObjectURL(localBannerPreview);
            setLocalBannerPreview(null);

            setOrg((o) => ({ ...o, defaultEventBannerUrl: "" }));
          }}
        />
      </div>

      {/* Actions */}
      <div className="brandingPanel__actionsBar">
        <div className="brandingPanel__status">
          {error ? <div className="brandingPanel__error">{error}</div> : null}
          {updated ? <div className="brandingPanel__success">Branding sauvegardé</div> : null}
        </div>

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

type AssetUploaderProps = {
  label: string;
  hint?: string;
  kind: "logo" | "banner";

  // url DB (stable)
  valueUrl?: string;

  // preview à afficher (local objectURL ou cache-bust)
  previewUrl?: string;

  onPickFile: (file: File) => void;
  onClear: () => void;
};

function AssetUploader({
  label,
  hint,
  kind,
  valueUrl,
  previewUrl,
  onPickFile,
  onClear,
}: AssetUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState<string>("");

  function openPicker() {
    inputRef.current?.click();
  }

  return (
    <div className="brandingPanel__asset">
      <div className="brandingPanel__assetHead">
        <div>
          <div className="brandingPanel__label">{label}</div>
          {hint ? <div className="brandingPanel__hint">{hint}</div> : null}
        </div>

        <div className="brandingPanel__assetActions">
          <Button
            variant="secondary"
            label={valueUrl ? "Remplacer" : "Choisir un fichier"}
            onClick={openPicker}
          />
          {valueUrl ? <Button variant="ghost" label="Retirer" onClick={onClear} /> : null}
        </div>
      </div>

      <input
        ref={inputRef}
        className="brandingPanel__fileInput"
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;

          const max = kind === "logo" ? 2 * 1024 * 1024 : 4 * 1024 * 1024;
          if (file.size > max) {
            alert(`${label} trop lourd (max ${kind === "logo" ? "2MB" : "4MB"})`);
            return;
          }

          setFileName(file.name);
          onPickFile(file);

          // reset input (permet de re-choisir le même fichier)
          e.currentTarget.value = "";
        }}
      />

      <div className="brandingPanel__thumbRow">
        <div className={`brandingPanel__thumb brandingPanel__thumb--${kind}`}>
          {previewUrl ? (
            <img src={previewUrl} alt={label} className="brandingPanel__thumbImg" />
          ) : (
            <div className="brandingPanel__thumbEmpty">Aucun fichier</div>
          )}
        </div>

        <div className="brandingPanel__thumbMeta">
          <div className="brandingPanel__metaTitle">{valueUrl ? "Actuel" : "Aucun"}</div>
        </div>
      </div>
    </div>
  );
}
