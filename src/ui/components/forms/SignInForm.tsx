import "../../../styles/auth.css";

import { useState } from "react";
import { loginSchema, type LoginInput } from "../../../domain/models/admin/admin.auth.schema";
import { authRepo } from "../../../gateways/supabase/repositories/auth/authRepo";
import { normalizeError } from "../../../domain/errors/errors";
import Button from "../button/Button";
import Input from "../inputs/Input";

export function SignInForm() {
  const [form, setForm] = useState<LoginInput>({
    email: "",
    password: "",
  });

  const [fieldErrors, setFieldErrors] =
    useState<Partial<Record<keyof LoginInput, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleChange<K extends keyof LoginInput>(key: K, value: LoginInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setFieldErrors((e) => ({ ...e, [key]: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    const parsed = loginSchema.safeParse(form);
    if (!parsed.success) {
      const errors: typeof fieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof LoginInput | undefined;
        if (field) errors[field] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    try {
      setLoading(true);
      await authRepo.signIn(parsed.data);
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
      />
      {fieldErrors.email && <p className="auth-error">{fieldErrors.email}</p>}

      <Input
        label="Mot de passe"
        placeholder="Votre mot de passe"
        type="password"
        value={form.password}
        onChange={(e) => handleChange("password", e.target.value)}
      />
      {fieldErrors.password && <p className="auth-error">{fieldErrors.password}</p>}

      {submitError && <p className="auth-error">{submitError}</p>}

      <Button type="submit" variant="primary" disabled={loading}>
        {loading ? "Connexion..." : "Se connecter"}
      </Button>
    </form>
  );
}
