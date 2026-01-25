// TODO rework with components, logo, styles, etc.

import { useState } from "react";
import { signupSchema, type SignupInput } from "../../../../domain/models/auth.schema";
import { authRepo } from "../../../../gateways/supabase/repositories/auth/authRepo";
import { normalizeError } from "../../../../domain/errors/errors";

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

    // 1️⃣ validation locale
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

    // 2️⃣ appel repo
    try {
      setLoading(true);
      const res = await authRepo.signUp(parsed.data);

      if (res.status === "CONFIRMATION_REQUIRED") {
        setSuccessMessage(
          "Compte créé. Un email de confirmation vient d’être envoyé. Confirme-le, puis reviens te connecter.",
        );
      } else {
        // si tu n'as pas la confirmation email (ou en dev), session directe
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
        {fieldErrors.password && <p className="text-red-500">{fieldErrors.password}</p>}
      </div>

      <div className="flex items-center gap-2">
        <input
          id="acceptTerms"
          type="checkbox"
          checked={form.acceptTerms}
          onChange={(e) => handleChange("acceptTerms", e.target.checked)}
        />
        <label htmlFor="acceptTerms" className="text-sm">
          J’accepte les conditions
        </label>
      </div>
      {fieldErrors.acceptTerms && (
        <p className="text-red-500">{fieldErrors.acceptTerms}</p>
      )}

      {submitError && <p className="text-red-600">{submitError}</p>}
      {successMessage && <p className="text-green-600">{successMessage}</p>}

      <button type="submit" disabled={loading}>
        {loading ? "Création..." : "Créer un compte"}
      </button>
    </form>
  );
}
