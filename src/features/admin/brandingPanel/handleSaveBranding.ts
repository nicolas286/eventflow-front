import type { SaveBrandingInput } from "../hooks/useSaveOrgBranding";
import type { OrgBranding } from "../../../domain/models/admin/admin.orgBranding.schema";

type HandleSaveParams = {
  orgId: string;
  form: SaveBrandingInput["form"];
  logoFile: File | null;
  bannerFile: File | null;

  saveOrgBranding: (args: SaveBrandingInput) => Promise<OrgBranding | null>;
  onSaved: () => Promise<void>;

  reset: () => void;
  clearLogo: () => void;
  clearBanner: () => void;
};

export async function handleSaveBranding({
  orgId,
  form,
  logoFile,
  bannerFile,
  saveOrgBranding,
  onSaved,
  reset,
  clearLogo,
  clearBanner,
}: HandleSaveParams) {
  reset();

  const res = await saveOrgBranding({
    orgId,
    form,
    logoFile,
    bannerFile,
  });

  if (!res) return;

  await onSaved();

  clearLogo();
  clearBanner();
}
