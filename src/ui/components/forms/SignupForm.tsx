import "../../../styles/auth.css";

import { useState } from "react";
import { signupSchema, type SignupInput } from "../../../domain/models/admin/admin.auth.schema";
import { authRepo } from "../../../gateways/supabase/repositories/auth/authRepo";
import { normalizeError } from "../../../domain/errors/errors";
import Button from "../button/Button";
import Input from "../inputs/Input";

export function SignUpForm() {
  const [form, setForm] = useState<SignupInput>({
    email: "",
    password: "",
    acceptTerms: false,
  });

  const [fieldErrors, setFieldErrors] =
    useState<Partial<Record<keyof SignupInput, string>>>({});

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleChange<K extends keyof SignupInput>(key: K, value: SignupInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setFieldErrors((e) => ({ ...e, [key]: undefined }));
    setSubmitError(null);
    setSuccessMessage(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSuccessMessage(null);

    const parsed = signupSchema.safeParse(form);
    if (!parsed.success) {
      const errors: typeof fieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof SignupInput | undefined;
        if (field) errors[field] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    try {
      setLoading(true);
      const res = await authRepo.signUp(parsed.data);

      if (res.status === "CONFIRMATION_REQUIRED") {
        setSuccessMessage(
          "Compte créé. Un email de confirmation vient d’être envoyé. Confirme-le, puis reviens te connecter.",
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
        onChange={(e) => handleChange("email", e.target.value)}
        autoComplete="email"
      />
      {fieldErrors.email && <p className="auth-error">{fieldErrors.email}</p>}

      <Input
        label="Mot de passe"
        type="password"
        value={form.password}
        placeholder="Votre mot de passe"
        onChange={(e) => handleChange("password", e.target.value)}
        autoComplete="new-password"
      />
      {fieldErrors.password && <p className="auth-error">{fieldErrors.password}</p>}

      <div className="auth-row">
        <input
          id="acceptTerms"
          type="checkbox"
          checked={form.acceptTerms}
          onChange={(e) => handleChange("acceptTerms", e.target.checked)}
        />
        <label htmlFor="acceptTerms" className="auth-checkbox-label">
          J’accepte les conditions
        </label>
      </div>
      {fieldErrors.acceptTerms && <p className="auth-error">{fieldErrors.acceptTerms}</p>}

      {submitError && <p className="auth-error">{submitError}</p>}
      {successMessage && <p className="auth-success">{successMessage}</p>}

      <Button type="submit" variant="primary" disabled={loading}>
        {loading ? "Création..." : "Créer un compte"}
      </Button>
    </form>
  );
}
