import "../pages/auth.desktop.css";
import "../pages/auth.mobile.css";

import { useState } from "react";
import { loginSchema, type LoginInput } from "../schemas/admin.auth.schema";
import { authRepo } from "../data/authRepo";
import { normalizeError } from "../../../../../domain/errors/errors";
import Button from "../../../../../ui/components/button/Button";
import PasswordInput from "../../../../../ui/components/inputs/PasswordInput";
import Input from "../../../../../ui/components/inputs/Input";
import { MessageBox } from "../../../../../ui/components/message/MessageBox";
import { useLiveForm } from "../../../../../features/public/useLiveZodForm";

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

      <PasswordInput
        label="Mot de passe"
        placeholder="Votre mot de passe"
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
