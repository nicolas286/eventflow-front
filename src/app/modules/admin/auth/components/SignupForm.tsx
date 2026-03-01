import "../pages/auth.desktop.css";
import "../pages/auth.mobile.css";

import { useState } from "react";
import { Link } from "react-router-dom";

import { signupSchema, type SignupInput } from "../schemas/admin.auth.schema";
import { authRepo } from "../data/authRepo";
import { normalizeError } from "../../../../../domain/errors/errors";
import Button from "../../../../../ui/components/button/Button";
import Input from "../../../../../ui/components/inputs/Input";
import PasswordInput from "../../../../../ui/components/inputs/PasswordInput";
import { MessageBox } from "../../../../../ui/components/message/MessageBox";
import { useLiveForm } from "../../../../../features/public/useLiveZodForm";

export function SignUpForm() {
  const live = useLiveForm<SignupInput>(signupSchema, {
    email: "",
    password: "",
    acceptTerms: false,
  });

  const { form, fieldErrors, handleChange, handleBlur, shouldShowFieldError } = live;

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSuccessMessage(null);
    live.touchAll(["email", "password", "acceptTerms"]);

    const parsed = live.validateAll();
    if (!parsed.ok) return;

    try {
      setLoading(true);
      const res = await authRepo.signUp(parsed.data);

      if (res.status === "CONFIRMATION_REQUIRED") {
        setSuccessMessage(
          "Compte créé. Un email de confirmation vient d’être envoyé. Confirmez-le et revenez vous connecter.",
        );
      } else {
        setSuccessMessage("Compte créé, connexion en cours…");
      }
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
          setSuccessMessage(null);
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

      <div className="auth-row">
        <input
          id="acceptTerms"
          type="checkbox"
          checked={form.acceptTerms}
          onChange={(e) => {
            setSubmitError(null);
            setSuccessMessage(null);
            handleChange("acceptTerms", e.target.checked);
          }}
          onBlur={() => handleBlur("acceptTerms")}
        />
        <label htmlFor="acceptTerms" className="auth-checkbox-label">
          J’accepte les{" "}
          <Link to="/cgu" className="auth-link">
            conditions générales
          </Link>
        </label>
      </div>

      {shouldShowFieldError("acceptTerms", { hideUntilTouched: true }) &&
        fieldErrors.acceptTerms && (
          <MessageBox variant="error">{fieldErrors.acceptTerms}</MessageBox>
        )}

      {submitError && <MessageBox variant="error">{submitError}</MessageBox>}
      {successMessage && <MessageBox variant="success">{successMessage}</MessageBox>}

      <Button type="submit" variant="primary" disabled={loading}>
        {loading ? "Création..." : "Créer un compte"}
      </Button>
    </form>
  );
}