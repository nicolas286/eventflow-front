import type { RuntimeConfig } from "./types.ts";
import { internal } from "./errors.ts";
import { parseAllowedOrigins, resolveAppBaseUrlFromRequest } from "./origins.ts";

function envTrim(name: string): string | null {
  const v = Deno.env.get(name);
  const t = typeof v === "string" ? v.trim() : "";
  return t || null;
}

export function resolveRuntimeConfig(req: Request): RuntimeConfig {
  const allowedOrigins = parseAllowedOrigins(envTrim("APP_ALLOWED_ORIGINS"));
  const appBaseUrl = resolveAppBaseUrlFromRequest(req, allowedOrigins) ?? envTrim("APP_BASE_URL");

  const config: RuntimeConfig = {
    supabaseUrl: envTrim("SUPABASE_URL") ?? "",
    serviceKey: envTrim("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    functionsBase: envTrim("FUNCTIONS_URL") ?? "",
    appBaseUrl: appBaseUrl ?? "",
    edgeServiceToken: envTrim("EDGE_SERVICE_TOKEN"),
    registerRateLimitPer10Min: Number(envTrim("REGISTER_RATE_LIMIT_PER_10MIN") ?? "50"),
    turnstileSecret: envTrim("TURNSTILE_SECRET_KEY"),
    turnstileBypass: envTrim("TURNSTILE_BYPASS") === "1",
    debugErrors: envTrim("DEBUG_ERRORS") === "1",
    allowedOrigins,
  };

  if (!config.supabaseUrl || !config.serviceKey || !config.functionsBase || !config.appBaseUrl) {
    throw internal("CONFIG_MISSING");
  }

  return config;
}