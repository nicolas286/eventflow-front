import { useEffect, useState } from "react";
import { Button, Input } from "../../ui/components";
import { MessageBox } from "../../ui/components/message/MessageBox";
import { authRepo } from "../../gateways/supabase/repositories/auth/authRepo";
import { supabase } from "../../gateways/supabase/supabaseClient";
import { normalizeError } from "../../domain/errors/errors";
import "../../styles/desktop/auth.desktop.css";
import "../../styles/mobile/auth.mobile.css";

import { z } from "zod";
import { signupSchema } from "../../domain/models/admin/admin.auth.schema";
import { useLiveForm } from "../../features/public/useLiveZodForm"; // adapte le chemin
import PublicFooter from "../../ui/components/publicFooter/PublicFooter";

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

export function AdminResetPasswordPage() {
  const [canReset, setCanReset] = useState(false);

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
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
          if (error) throw error;
        }

        const { data } = await supabase.auth.getSession();
        if (!mounted) return;

        if (data.session) setCanReset(true);
      } catch {
        if (!mounted) return;
        setCanReset(false);
      }
    }

    bootstrapRecovery();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
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
      setOkMsg("Mot de passe mis à jour. Tu peux te reconnecter.");
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
            Lien invalide ou expiré. Recommencez une demande “Mot de passe oublié”.
          </MessageBox>
        </div>
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
          <Input
            label="Nouveau mot de passe"
            type="password"
            placeholder="Nouveau mot de passe"
            value={form.password}
            onChange={(e) => {
              setErrorMsg(null);
              setOkMsg(null);
              handleChange("password", e.target.value);

              if (form.confirmPassword) handleChange("confirmPassword", form.confirmPassword);
            }}
            onBlur={() => handleBlur("password")}
            autoComplete="new-password"
          />
          {shouldShowFieldError("password") && fieldErrors.password && (
            <MessageBox variant="error">{fieldErrors.password}</MessageBox>
          )}

          <Input
            label="Confirmer le mot de passe"
            type="password"
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

          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? "Mise à jour..." : "Mettre à jour"}
          </Button>
        </form>
      </div>
    <PublicFooter />
      
    </div>
  );
}
