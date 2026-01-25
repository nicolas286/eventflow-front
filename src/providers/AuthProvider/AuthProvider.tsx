import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session, User, AuthChangeEvent } from "@supabase/supabase-js";
import { supabase } from "../../gateways/supabase/supabaseClient";
import { authRepo } from "../../gateways/supabase/repositories/auth/authRepo";
import { AuthContext, type AuthContextValue } from "./AuthContext";
import type { AppError } from "../../domain/errors/errors";
import { normalizeError } from "../../domain/errors/errors";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [bootstrapError, setBootstrapError] = useState<AppError | null>(null);
  const [loading, setLoading] = useState(true);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    (async () => {
      try {
        const s = await authRepo.getSession();
        if (!mountedRef.current) return;

        setSession(s);
        setUser(s?.user ?? null);
        setBootstrapError(null);
      } catch (e) {
        if (!mountedRef.current) return;
        setBootstrapError(normalizeError(e, "Impossible d'initialiser la session."));
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, newSession: Session | null) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setBootstrapError(null);
      },
    );

    return () => {
      mountedRef.current = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    await authRepo.signOut();
  }, []);

  const value: AuthContextValue = {
    user,
    session,
    bootstrapError,
    loading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
