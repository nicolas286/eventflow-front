import "../../../styles/brandingPanel.css";
import { Button, Card, CardBody, CardHeader, Input, Badge } from "../../../ui/components";

export type Org = {
  name: string;
  primaryColor: string;
  logoUrl?: string;
};

type BrandingPanelProps = {
  org: Org;
  setOrg: React.Dispatch<React.SetStateAction<Org>>;
};

export default function BrandingPanel({ org, setOrg }: BrandingPanelProps) {
  return (
    <Card>
      <CardHeader title="Branding billetterie" subtitle="Couleur + logo" />
      <CardBody>
        <div className="brandingPanel">
          <Input
            label="Nom (ASBL / Organisateur)"
              value={org.name}
            onChange={(e) => setOrg((o) => ({ ...o, name: e.target.value }))}
          />

          <div>
            <div className="brandingPanel__label">Couleur principale</div>
            <div className="brandingPanel__row">
              <input
                type="color"
                  value={org.primaryColor}
                 onChange={(e) => setOrg((o) => ({ ...o, primaryColor: e.target.value }))}
                className="brandingPanel__color"
              />

              <Input
                value={org.primaryColor}
                onChange={(e) => setOrg((o) => ({ ...o, primaryColor: e.target.value }))}
                placeholder="#2563eb"
              />
            </div>
          </div>

           <LogoUploader org={org} setOrg={setOrg} />

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
  org: Org;
  setOrg: React.Dispatch<React.SetStateAction<Org>>;
};

function LogoUploader({ org, setOrg }: LogoUploaderProps) {
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
              reader.onload = () => setOrg((o) => ({ ...o, logoUrl: String(reader.result) }));
            reader.readAsDataURL(file);
          }}
        />

         {org.logoUrl ? (
          <Button variant="secondary" label="Retirer" onClick={() => setOrg((o) => ({ ...o, logoUrl: "" }))} />
        ) : null}
      </div>
    </div>
  );
}
