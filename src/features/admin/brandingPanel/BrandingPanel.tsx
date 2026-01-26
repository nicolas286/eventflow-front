import "../../../styles/brandingPanel.css";
import { Button, Card, CardBody, CardHeader, Input, Badge } from "../../../ui/components";

export type BrandingDraft = {
  displayName: string;
  primaryColor: string | null;
  logoUrl: string | null;
};

type BrandingPanelProps = {
  branding: BrandingDraft;
  onChange: (patch: Partial<BrandingDraft>) => void;
};

export default function BrandingPanel({ branding, onChange }: BrandingPanelProps) {
  return (
    <Card>
      <CardHeader title="Branding billetterie" subtitle="Couleur + logo" />
      <CardBody>
        <div className="brandingPanel">
          <Input
            label="Nom (ASBL / Organisateur)"
            value={branding.displayName}
            onChange={(e) => onChange({ displayName: e.target.value })}
          />

          <div>
            <div className="brandingPanel__label">Couleur principale</div>
            <div className="brandingPanel__row">
              <input
                type="color"
                value={branding.primaryColor ?? "#2563eb"}
                onChange={(e) => onChange({ primaryColor: e.target.value })}
                className="brandingPanel__color"
              />

              <Input
                value={branding.primaryColor ?? ""}
                onChange={(e) => onChange({ primaryColor: e.target.value })}
                placeholder="#2563eb"
              />
            </div>
          </div>

          <LogoUploader
            logoUrl={branding.logoUrl}
            onChangeLogoUrl={(logoUrl) => onChange({ logoUrl })}
          />

          <div className="brandingPanel__preview">
            <Button variant="primary" label="Action primaire" />
            <Button variant="secondary" label="Secondaire" />
            <Badge tone="info" label="Badge" />
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

type LogoUploaderProps = {
  logoUrl: string | null;
  onChangeLogoUrl: (v: string | null) => void;
};

function LogoUploader({ logoUrl, onChangeLogoUrl }: LogoUploaderProps) {
  return (
    <div>
      <div className="brandingPanel__label">Logo</div>

      <div className="brandingPanel__row">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (file.size > 2 * 1024 * 1024) return alert("Logo trop lourd (max 2MB)");

            const reader = new FileReader();
            reader.onload = () => onChangeLogoUrl(String(reader.result));
            reader.readAsDataURL(file);
          }}
        />

        {logoUrl && (
          <Button
            variant="secondary"
            label="Retirer"
            onClick={() => onChangeLogoUrl(null)}
          />
        )}
      </div>
    </div>
  );
}
