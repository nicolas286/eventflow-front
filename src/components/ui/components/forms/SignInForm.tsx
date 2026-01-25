// TODO rework with components, logo, styles, etc.

import { useState } from "react";
import { loginSchema, type LoginInput } from "../../../../domain/models/auth.schema";
import { authRepo } from "../../../../gateways/supabase/repositories/auth/authRepo";
import { AppError } from "../../../../domain/errors/errors";

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

    // 1️⃣ validation locale
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

    // 2️⃣ appel repo
    try {
      setLoading(true);
      await authRepo.signIn(parsed.data);
      // succès → AuthProvider prendra le relais via onAuthStateChange
    } catch (e) {
      if (e instanceof AppError) {
        setSubmitError(e.message);
      } else {
        setSubmitError("Erreur inconnue.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label>Email</label>
        <input
          type="email"
          value={form.email}
          onChange={(e) => handleChange("email", e.target.value)}
        />
        {fieldErrors.email && <p className="text-red-500">{fieldErrors.email}</p>}
      </div>

      <div>
        <label>Mot de passe</label>
        <input
          type="password"
          value={form.password}
          onChange={(e) => handleChange("password", e.target.value)}
        />
        {fieldErrors.password && (
          <p className="text-red-500">{fieldErrors.password}</p>
        )}
      </div>

      {submitError && <p className="text-red-600">{submitError}</p>}

      <button type="submit" disabled={loading}>
        {loading ? "Connexion..." : "Se connecter"}
      </button>
    </form>
  );
}
