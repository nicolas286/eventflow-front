import "../../../styles/desktop/auth.desktop.css";
import "../../../styles/mobile/auth.mobile.css";

import { useState } from "react";
import { loginSchema, type LoginInput } from "../../../domain/models/admin/admin.auth.schema";
import { authRepo } from "../../../gateways/supabase/repositories/auth/authRepo";
import { normalizeError } from "../../../domain/errors/errors";
import Button from "../button/Button";
import Input from "../inputs/Input";
import { MessageBox } from "../message/MessageBox";
import { useLiveForm } from "../../../features/public/useLiveZodForm";

export function SignInForm() {
  const live = useLiveForm<LoginInput>(loginSchema, {
    email: "",
    password: "",
  });

  const { form, fieldErrors, handleChange, handleBlur, shouldShowFieldError } = live;

  const [rememberMe, setRememberMe] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    live.touchAll(["email", "password"]);
    const parsed = live.validateAll();
    if (!parsed.ok) return;

    try {
      setLoading(true);

      await authRepo.signIn(parsed.data, {
        rememberMe,
      });

    } catch (e) {
      const err = normalizeError(e, "Erreur inconnue.");
      setSubmitError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <Input
        label="Email"
        type="email"
        placeholder="Adresse email"
        value={form.email}
        onChange={(e) => {
          setSubmitError(null);
          handleChange("email", e.target.value);
        }}
        onBlur={() => handleBlur("email")}
        autoComplete="email"
      />
      {shouldShowFieldError("email") && fieldErrors.email && (
        <MessageBox variant="error">{fieldErrors.email}</MessageBox>
      )}

      <Input
        label="Mot de passe"
        placeholder="Votre mot de passe"
        type="password"
        value={form.password}
        onChange={(e) => {
          setSubmitError(null);
          handleChange("password", e.target.value);
        }}
        onBlur={() => handleBlur("password")}
        autoComplete="current-password"
      />
      {shouldShowFieldError("password") && fieldErrors.password && (
        <MessageBox variant="error">{fieldErrors.password}</MessageBox>
      )}

      {/* ✅ Remember me */}
      <div className="auth-row">
        <input
          id="rememberMe"
          type="checkbox"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
        />
        <label htmlFor="rememberMe" className="auth-checkbox-label">
          Se souvenir de moi
        </label>
      </div>

      {submitError && <MessageBox variant="error">{submitError}</MessageBox>}

      <Button type="submit" variant="primary" disabled={loading}>
        {loading ? "Connexion..." : "Se connecter"}
      </Button>
    </form>
  );
}
