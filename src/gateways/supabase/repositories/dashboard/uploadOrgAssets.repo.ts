// gateways/supabase/repositories/storage/uploadOrgAssetsRepo.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseStorageSafe } from "../../supabaseStorageSafe";

type UploadResult = {
  path: string;
  publicUrl: string;
  publicUrlWithBust: string;
};

function safeExt(file: File) {
  const m = (file.name || "").toLowerCase().match(/\.([a-z0-9]+)$/);
  const ext = m?.[1] ?? "png";
  if (!["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext)) return "png";
  return ext === "jpeg" ? "jpg" : ext;
}

function withBust(url: string, seed?: string | number) {
  const sep = url.includes("?") ? "&" : "?";
  const v =
    typeof seed === "number"
      ? seed
      : typeof seed === "string"
      ? Date.parse(seed) || Date.now()
      : Date.now();
  return `${url}${sep}v=${v}`;
}

export function uploadOrgAssetsRepo(supabase: SupabaseClient) {
  const bucket = "public-assets";

  async function uploadStable(params: {
    path: string;
    file: File;
    upsert?: boolean;
  }): Promise<UploadResult> {
    const { path, file, upsert = true } = params;

    await supabaseStorageSafe(() =>
      supabase.storage.from(bucket).upload(path, file, {
        upsert,
        contentType: file.type || undefined,

        // ✅ CRUCIAL: sinon tu gardes des vieilles versions 1h
        // (et “remplacer” paraît ne pas marcher)
        cacheControl: "0",
      })
    );

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    const publicUrl = data?.publicUrl;
    if (!publicUrl) throw new Error("PUBLIC_URL_NOT_AVAILABLE");

    return {
      path,
      publicUrl, // raw DB value
      publicUrlWithBust: withBust(publicUrl), // UI immediate refresh
    };
  }

  return {
    /**
     * orgs/<orgId>/logo/logo.<ext>
     */
    async uploadOrgLogo(params: { orgId: string; file: File }) {
      const ext = safeExt(params.file);
      const path = `orgs/${params.orgId}/logo/logo.${ext}`;
      return uploadStable({ path, file: params.file });
    },

    /**
     * orgs/<orgId>/default_banner/default_banner.<ext>
     */
    async uploadOrgDefaultBanner(params: { orgId: string; file: File }) {
      const ext = safeExt(params.file);
      const path = `orgs/${params.orgId}/default_banner/default_banner.${ext}`;
      return uploadStable({ path, file: params.file });
    },

    /**
     * orgs/<orgId>/events/<eventId>/banner/banner.<ext>
     */
    async uploadEventBanner(params: { orgId: string; eventId: string; file: File }) {
      const ext = safeExt(params.file);
      const path = `orgs/${params.orgId}/events/${params.eventId}/banner/banner.${ext}`;
      return uploadStable({ path, file: params.file });
    },
  };
}
