import { internal } from "../_shared/errors.ts";
import { envTrim, resolveSupabaseRuntimeConfig } from "../_shared/config.ts";

export function resolveRuntimeConfig() {
  const supabase = resolveSupabaseRuntimeConfig();

  const config = {
    ...supabase,
    appBaseUrl: envTrim("APP_BASE_URL"),
    mailServiceUrl: envTrim("MAIL_SERVICE_URL"),
    mailServiceToken: envTrim("MAIL_SERVICE_TOKEN"),
    edgeServiceToken: envTrim("EDGE_SERVICE_TOKEN"),
  };

  if (!config.appBaseUrl) throw internal("APP_BASE_URL_MISSING");
  if (!config.mailServiceUrl) throw internal("MAIL_SERVICE_URL_MISSING");
  if (!config.mailServiceToken) throw internal("MAIL_SERVICE_TOKEN_MISSING");
  if (!config.edgeServiceToken) throw internal("EDGE_SERVICE_TOKEN_MISSING");

  return config;
}