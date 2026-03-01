import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";

import { Button } from "../../ui/components";
import PasswordInput from "../../ui/components/inputs/PasswordInput";
import { MessageBox } from "../../ui/components/message/MessageBox";
import PublicFooter from "../../ui/components/publicFooter/PublicFooter";

import { authRepo } from "../../gateways/supabase/repositories/auth/authRepo";
import { supabase } from "../../gateways/supabase/supabaseClient";
import { normalizeError } from "../../domain/errors/errors";

import "../../styles/desktop/auth.desktop.css";
import "../../styles/mobile/auth.mobile.css";

import { signupSchema } from "../../domain/models/admin/admin.auth.schema";
import { useLiveForm } from "../../features/public/useLiveZodForm"; // adapte le chemin

const resetPasswordSchema = z
  .object({
    password: signupSchema.shape.password,
    confirmPassword: z.string().min(1, "Confirmez le mot de passe."),
  })
  .superRefine((val, ctx) => {
    if (val.password !== val.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Les mots de passe ne correspondent pas.",
      });
    }
  });

type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/** Supabase peut renvoyer des erreurs dans le hash:
 *  #error=access_denied&error_code=otp_expired&error_description=...
 */
function parseSupabaseHashError(): string | null {
  const hash = window.location.hash || "";
  if (!hash.startsWith("#")) return null;

  const params = new URLSearchParams(hash.slice(1));

  const error = params.get("error");
  const errorCode = params.get("error_code");
  const descRaw = params.get("error_description");

  if (!error && !errorCode && !descRaw) return null;

  // decode safe (hash query-style uses + for space)
  const desc = descRaw ? decodeURIComponent(descRaw.replace(/\+/g, " ")) : null;

  if (errorCode === "otp_expired") {
    return "Lien expiré. Recommencez une demande “Mot de passe oublié”.";
  }

  // access_denied est souvent utilisé pour divers refus (invalid/expired, etc.)
  if (error === "access_denied" || errorCode === "access_denied") {
    return "Lien invalide ou expiré. Recommencez une demande “Mot de passe oublié”.";
  }

  return desc ?? "Lien invalide ou expiré. Recommencez une demande “Mot de passe oublié”.";
}

function clearHashFromUrl() {
  // Retire le hash sans recharger la page
  const clean = window.location.pathname + window.location.search;
  window.history.replaceState({}, document.title, clean);
}

export function AdminResetPasswordPage() {
  // Autorise le reset uniquement si on est réellement dans un flow "recovery"
  const [canReset, setCanReset] = useState(false);

  // Message d’erreur lié au lien de recovery (hash error ou exchangeCode fail)
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  const live = useLiveForm<ResetPasswordInput>(resetPasswordSchema, {
    password: "",
    confirmPassword: "",
  });

  const { form, fieldErrors, handleChange, handleBlur, shouldShowFieldError } = live;

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function bootstrapRecovery() {
      try {
        // ✅ 0) Reset des états
        if (!mounted) return;
        setCanReset(false);
        setRecoveryError(null);

        // ✅ 1) Traiter les erreurs éventuelles renvoyées dans le hash
        const hashErr = parseSupabaseHashError();
        if (hashErr) {
          if (!mounted) return;
          setRecoveryError(hashErr);
          setCanReset(false);
          clearHashFromUrl(); // évite de garder l’erreur dans l’URL
          return;
        }

        // ✅ 2) Autoriser uniquement si on a un code de recovery à échanger
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        // Pas de code => on attend éventuellement l'event PASSWORD_RECOVERY
        if (!code) return;

        // Échange code -> session (recovery)
        const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
        if (error) throw error;

        if (!mounted) return;
        setCanReset(true);
      } catch {
        if (!mounted) return;
        setCanReset(false);
        setRecoveryError("Lien invalide ou expiré. Recommencez une demande “Mot de passe oublié”.");
      }
    }

    bootstrapRecovery();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      // ✅ 3) Autoriser le reset si Supabase signale explicitement un recovery
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY") setCanReset(true);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setOkMsg(null);

    live.touchAll(["password", "confirmPassword"]);
    const parsed = live.validateAll();
    if (!parsed.ok) return;

    try {
      setLoading(true);
      await authRepo.updatePassword(parsed.data.password);
      setOkMsg("Mot de passe mis à jour. Vous pouvez vous reconnecter.");
    } catch (e) {
      const err = normalizeError(e, "Erreur inconnue.");
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!canReset) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <MessageBox variant="error">
            {recoveryError ?? "Lien invalide ou expiré. Recommencez une demande “Mot de passe oublié”."}
          </MessageBox>

          <div className="auth-links">
            <Link to="/admin/login" className="auth-link">
              Se connecter
            </Link>
          </div>
        </div>

        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">Réinitialisation de votre mot de passe</h1>
          <p className="auth-subtitle">Modifiez votre mot de passe ci-dessous.</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <PasswordInput
            label="Nouveau mot de passe"
            placeholder="Nouveau mot de passe"
            value={form.password}
            onChange={(e) => {
              setErrorMsg(null);
              setOkMsg(null);
              handleChange("password", e.target.value);
              // garde confirmPassword “en phase” pour afficher l'erreur si besoin
              if (form.confirmPassword) handleChange("confirmPassword", form.confirmPassword);
            }}
            onBlur={() => handleBlur("password")}
            autoComplete="new-password"
          />
          {shouldShowFieldError("password") && fieldErrors.password && (
            <MessageBox variant="error">{fieldErrors.password}</MessageBox>
          )}

          <PasswordInput
            label="Confirmer le mot de passe"
            placeholder="Confirmez le mot de passe"
            value={form.confirmPassword}
            onChange={(e) => {
              setErrorMsg(null);
              setOkMsg(null);
              handleChange("confirmPassword", e.target.value);
            }}
            onBlur={() => handleBlur("confirmPassword")}
            autoComplete="new-password"
          />
          {shouldShowFieldError("confirmPassword") && fieldErrors.confirmPassword && (
            <MessageBox variant="error">{fieldErrors.confirmPassword}</MessageBox>
          )}

          {errorMsg && <MessageBox variant="error">{errorMsg}</MessageBox>}
          {okMsg && <MessageBox variant="success">{okMsg}</MessageBox>}

          <div className="auth-links">
            <Link to="/admin/login" className="auth-link">
              Se connecter
            </Link>
          </div>

          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? "Mise à jour..." : "Mettre à jour"}
          </Button>
        </form>
      </div>

      <PublicFooter />
    </div>
  );
}