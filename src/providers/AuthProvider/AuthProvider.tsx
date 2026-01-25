import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session, User, AuthChangeEvent } from "@supabase/supabase-js";
import { supabase } from "../../gateways/supabase/supabaseClient";
import { AuthContext, type AuthContextValue } from "./AuthContext";
import { AppError } from "../../domain/errors/errors";

type AuthContextInternal = {
  user: User | null;
  session: Session | null;
  bootstrapError: AppError | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [bootstrapError, setBootstrapError] = useState<AppError | null>(null);
  const [loading, setLoading] = useState(true);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const init = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!mountedRef.current) return;

        if (error) {
          setBootstrapError(new AppError({
            code: "UNKNOWN",
            message: "Impossible de récupérer la session.",
            cause: error,
            }));

        } else {
          setSession(data.session);
          setUser(data.session?.user ?? null);
          setBootstrapError(null);
        }
      } catch (e) {
        console.error("getSession failed:", e);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    };

    init();

    const { data: sub } = supabase.auth.onAuthStateChange(
    (_event: AuthChangeEvent, newSession: Session | null) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setBootstrapError(null);
    }
    );


    return () => {
      mountedRef.current = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error; 
}, []);


  const value: AuthContextInternal = {
    user,
    session,
    bootstrapError,
    loading,
    signOut,
  };

  return <AuthContext.Provider value={value as AuthContextValue}>{children}</AuthContext.Provider>;
}
