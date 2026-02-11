import "../../../styles/desktop/auth.desktop.css";
import "../../../styles/mobile/auth.mobile.css";

import { useMemo, useState } from "react";
import { signupSchema, type SignupInput } from "../../../domain/models/admin/admin.auth.schema";
import { authRepo } from "../../../gateways/supabase/repositories/auth/authRepo";
import { normalizeError } from "../../../domain/errors/errors";
import Button from "../button/Button";
import Input from "../inputs/Input";
import { MessageBox } from "../message/MessageBox";
import { TermsModal } from "../modals/TermsModal";

export function SignUpForm() {
  const [form, setForm] = useState<SignupInput>({
    email: "",
    password: "",
    acceptTerms: false,
  });

  const [fieldErrors, setFieldErrors] =
    useState<Partial<Record<keyof SignupInput, string>>>({});

  const [touched, setTouched] = useState<Partial<Record<keyof SignupInput, boolean>>>({});

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [termsOpen, setTermsOpen] = useState(false);

  function validateField<K extends keyof SignupInput>(key: K, value: SignupInput[K]) {
    // Validation champ par champ avec le "shape" Zod
    const shape = signupSchema.shape[key];
    const result = shape.safeParse(value);

    setFieldErrors((prev) => ({
      ...prev,
      [key]: result.success ? undefined : result.error.issues[0]?.message ?? "Champ invalide",
    }));

    return result.success;
  }

  function shouldShowFieldError<K extends keyof SignupInput>(key: K) {
    if (key === "acceptTerms") return !!touched.acceptTerms; // évite d’afficher direct au chargement
    const v = form[key];
    const hasValue = typeof v === "string" ? v.length > 0 : !!v;
    return !!touched[key] || hasValue;
  }

  function handleChange<K extends keyof SignupInput>(key: K, value: SignupInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSubmitError(null);
    setSuccessMessage(null);

    // Live validation : on valide directement à la frappe / au click
    // (mais l’affichage peut être conditionné par shouldShowFieldError)
    validateField(key, value);
  }

  function handleBlur<K extends keyof SignupInput>(key: K) {
    setTouched((t) => ({ ...t, [key]: true }));
    validateField(key, form[key]);
  }

  const passwordHints = useMemo(() => {
    const v = form.password ?? "";
    const okLen = v.length >= 8;
    const okRule = /[A-Z]/.test(v) || /\d/.test(v);

    return {
      okLen,
      okRule,
    };
  }, [form.password]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSuccessMessage(null);

    // marque tout comme "touché" pour afficher toutes les erreurs si submit foire
    setTouched({ email: true, password: true, acceptTerms: true });

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
    <>
      <form onSubmit={handleSubmit} className="auth-form">
        <Input
          label="Email"
          type="email"
          placeholder="Adresse email"
          value={form.email}
          onChange={(e) => handleChange("email", e.target.value)}
          onBlur={() => handleBlur("email")}
          autoComplete="email"
        />
        {shouldShowFieldError("email") && fieldErrors.email && (
          <MessageBox variant="error">{fieldErrors.email}</MessageBox>
        )}

        <Input
          label="Mot de passe"
          type="password"
          value={form.password}
          placeholder="Votre mot de passe"
          onChange={(e) => handleChange("password", e.target.value)}
          onBlur={() => handleBlur("password")}
          autoComplete="new-password"
        />

        {shouldShowFieldError("password") && fieldErrors.password && (
          <MessageBox variant="error">{fieldErrors.password}</MessageBox>
        )}

        <div className="auth-row">
          <input
            id="acceptTerms"
            type="checkbox"
            checked={form.acceptTerms}
            onChange={(e) => handleChange("acceptTerms", e.target.checked)}
            onBlur={() => handleBlur("acceptTerms")}
          />
          <label htmlFor="acceptTerms" className="auth-checkbox-label">
            J’accepte les{" "}
            <button
              type="button"
              className="auth-link"
              onClick={() => setTermsOpen(true)}
            >
              conditions
            </button>
          </label>
        </div>

        {shouldShowFieldError("acceptTerms") && fieldErrors.acceptTerms && (
          <MessageBox variant="error">{fieldErrors.acceptTerms}</MessageBox>
        )}

        {submitError && <MessageBox variant="error">{submitError}</MessageBox>}
        {successMessage && <MessageBox variant="success">{successMessage}</MessageBox>}

        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? "Création..." : "Créer un compte"}
        </Button>
      </form>

      <TermsModal open={termsOpen} onClose={() => setTermsOpen(false)} />
    </>
  );
}
