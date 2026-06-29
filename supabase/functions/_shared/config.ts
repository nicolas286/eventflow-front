import { internal } from "./errors.ts";

export function envTrim(name: string): string | null {
  const v = Deno.env.get(name);
  const t = typeof v === "string" ? v.trim() : "";
  return t || null;
}

export type SupabaseRuntimeConfig = {
  supabaseUrl: string;
  anonKey: string;
  serviceKey: string;
};

export function resolveSupabaseRuntimeConfig(): SupabaseRuntimeConfig {
  const supabaseUrl = envTrim("SUPABASE_URL");
  const anonKey = envTrim("SUPABASE_ANON_KEY");
  const serviceKey = envTrim("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceKey) {
    throw internal("CONFIG_MISSING");
  }

  return {
    supabaseUrl,
    anonKey,
    serviceKey,
  };
}