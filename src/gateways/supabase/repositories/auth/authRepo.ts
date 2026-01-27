import type { Session } from "@supabase/supabase-js";
import { supabase } from "../../supabaseClient";
import { normalizeError } from "../../../../domain/errors/errors";
import { loginSchema, signupSchema } from "../../../../domain/models/admin/admin.auth.schema";
import type { LoginInput, SignupInput } from "../../../../domain/models/admin/admin.auth.schema";

export type SignUpResult =
  | { status: "CONFIRMATION_REQUIRED" }
  | { status: "SIGNED_IN" };

export const authRepo = {
  async getSession(): Promise<Session | null> {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return data.session ?? null;
    } catch (e) {
      throw normalizeError(e, "Impossible de récupérer la session.");
    }
  },

  async signIn(input: LoginInput): Promise<void> {
    try {
      const parsed = loginSchema.parse(input); 
      const { error } = await supabase.auth.signInWithPassword(parsed);
      if (error) throw error;
    } catch (e) {
      throw normalizeError(e, "Connexion impossible.");
    }
  },

  async signUp(input: SignupInput): Promise<SignUpResult> {
    try {
      const parsed = signupSchema.parse(input); 
      const { email, password } = parsed;

      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;

      if (!data.session) return { status: "CONFIRMATION_REQUIRED" };
      return { status: "SIGNED_IN" };
    } catch (e) {
      throw normalizeError(e, "Inscription impossible.");
    }
  },

  async signOut(): Promise<void> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (e) {
      throw normalizeError(e, "Déconnexion impossible.");
    }
  },
};
