import { useState } from "react";
import { Button } from "../../ui/components";
import { Input } from "../../ui/components";
import { MessageBox } from "../../ui/components/message/MessageBox";
import { authRepo } from "../../gateways/supabase/repositories/auth/authRepo";
import { normalizeError } from "../../domain/errors/errors";
import "../../styles/desktop/auth.desktop.css";
import "../../styles/mobile/auth.mobile.css";
import PublicFooter from "../../ui/components/publicFooter/PublicFooter";



export function AdminForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setOkMsg(null);

    try {
      setLoading(true);
      await authRepo.requestPasswordReset(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      setOkMsg("Si un compte existe pour cette adresse, un email de réinitialisation vient d’être envoyé.");
    } catch (e) {
      const err = normalizeError(e, "Erreur inconnue.");
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
        <div className="auth-card">
                <div className="auth-header">
          <h1 className="auth-title">Mot de passe oublié ?</h1>
          <p className="auth-subtitle">
            Nous envoyons un lien de récupération à votre adresse e-mail.
          </p>
        </div>
            <form onSubmit={handleSubmit} className="auth-form">
            <Input
                label="Email"
                type="email"
                placeholder="Adresse email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
            />

            {errorMsg && <MessageBox variant="error">{errorMsg}</MessageBox>}
            {okMsg && <MessageBox variant="success">{okMsg}</MessageBox>}

            <Button type="submit" variant="primary" disabled={loading}>
                {loading ? "Envoi..." : "Envoyer le lien"}
            </Button>
            </form>
        </div>
        <PublicFooter/>
    </div>
  );
}
