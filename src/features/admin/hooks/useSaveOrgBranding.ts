// features/admin/hooks/useSaveOrgBranding.ts
import { useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { uploadOrgAssetsRepo } from "../../../gateways/supabase/repositories/dashboard/uploadOrgAssets.repo";
import { updateOrgBrandingRepo } from "../../../gateways/supabase/repositories/dashboard/updateOrgBrandingRepo";

import type {
  OrgBranding,
  OrgBrandingForm,
} from "../../../domain/models/admin/admin.orgBranding.schema";

import { normalizeError } from "../../../domain/errors/errors";

type SaveInput = {
  orgId: string;
  form: OrgBrandingForm;

  // nouveaux fichiers (optionnels)
  logoFile?: File | null;
  bannerFile?: File | null;
};

type State = {
  loading: boolean;
  error: string | null;

  updated: OrgBranding | null;

  // ✅ pour refresh instantané UI (cache-bust)
  previewLogoUrl: string | null;
  previewBannerUrl: string | null;
};

export function useSaveOrgBranding(params: { supabase: SupabaseClient }) {
  const { supabase } = params;

  const storageRepo = useMemo(() => uploadOrgAssetsRepo(supabase), [supabase]);
  const brandingRepo = useMemo(() => updateOrgBrandingRepo(supabase), [supabase]);

  const [state, setState] = useState<State>({
    loading: false,
    error: null,
    updated: null,
    previewLogoUrl: null,
    previewBannerUrl: null,
  });

  async function saveOrgBranding(input: SaveInput): Promise<OrgBranding | null> {
    try {
      setState((s) => ({
        ...s,
        loading: true,
        error: null,
        updated: null,
        previewLogoUrl: null,
        previewBannerUrl: null,
      }));

      let logoUrl: string | null = input.form.logoUrl ?? null;
      let defaultEventBannerUrl: string | null = input.form.defaultEventBannerUrl ?? null;

      let previewLogoUrl: string | null = null;
      let previewBannerUrl: string | null = null;

      // 1) upload logo si nouveau fichier
      if (input.logoFile) {
        const up = await storageRepo.uploadOrgLogo({
          orgId: input.orgId,
          file: input.logoFile,
        });

        // ✅ DB: URL stable
        logoUrl = up.publicUrl;

        // ✅ UI: refresh immédiat
        previewLogoUrl = up.publicUrlWithBust;
      }

      // 2) upload banner si nouveau fichier
      if (input.bannerFile) {
        const up = await storageRepo.uploadOrgDefaultBanner({
          orgId: input.orgId,
          file: input.bannerFile,
        });

        defaultEventBannerUrl = up.publicUrl;
        previewBannerUrl = up.publicUrlWithBust;
      }

      // 3) update DB (branding)
      const updated = await brandingRepo.updateOrgBranding({
        orgId: input.orgId,
        patch: {
          displayName: input.form.displayName,
          primaryColor: input.form.primaryColor,
          logoUrl,
          defaultEventBannerUrl,
        },
      });

      setState({
        loading: false,
        error: null,
        updated,
        previewLogoUrl,
        previewBannerUrl,
      });

      return updated;
    } catch (e: unknown) {
      const ne = normalizeError(e, "Impossible de sauvegarder le branding");
      setState({
        loading: false,
        error: ne.message,
        updated: null,
        previewLogoUrl: null,
        previewBannerUrl: null,
      });
      return null;
    }
  }

  function reset() {
    setState({
      loading: false,
      error: null,
      updated: null,
      previewLogoUrl: null,
      previewBannerUrl: null,
    });
  }

  return {
    ...state,
    saveOrgBranding,
    reset,
  };
}
