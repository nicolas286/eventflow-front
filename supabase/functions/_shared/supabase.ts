import { createClient } from "npm:@supabase/supabase-js@2.75.0";

export type SupabaseRuntimeConfig = {
  supabaseUrl: string;
  anonKey?: string;
  serviceKey: string;
};

export function createAdminClient(config: SupabaseRuntimeConfig) {
  return createClient(config.supabaseUrl, config.serviceKey);
}