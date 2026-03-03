import type { ReactNode } from "react";
import { useEffect } from "react";
import { z } from "zod";

import Button from "../button/Button";
import PasswordInput from "../inputs/PasswordInput";
import { MessageBox } from "../message/MessageBox"; // adapte si ton chemin est différent

import { signupSchema } from "../../../../app/modules/admin/auth/schemas/admin.auth.schema";
import { useLiveForm } from "../../../hooks/useLiveZodForm"; // adapte le chemin chez toi

type ChangePasswordModalProps = {
  isOpen: boolean;

  title?: ReactNode;

  confirmLabel?: ReactNode;
  confirmLoadingLabel?: ReactNode;
  cancelLabel?: ReactNode;

  loading?: boolean;
  error?: ReactNode;

  onConfirm: (payload: { currentPassword: string; newPassword: string }) => void | Promise<void>;
  onCancel: () => void;
};

/* --------- ✅ Schema --------- */

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Entrez votre mot de passe actuel."),
    newPassword: signupSchema.shape.password,
    confirmPassword: z.string().min(1, "Confirmez le nouveau mot de passe."),
  })
  .superRefine((val, ctx) => {
    if (val.newPassword !== val.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Les mots de passe ne correspondent pas.",
      });
    }
    if (val.currentPassword && val.newPassword && val.currentPassword === val.newPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["newPassword"],
        message: "Le nouveau mot de passe doit être différent de l’actuel.",
      });
    }
  });

type ChangePasswordForm = z.infer<typeof changePasswordSchema>;

export function ChangePasswordModal({
  isOpen,
  title = "Changer le mot de passe",

  confirmLabel = "Mettre à jour",
  confirmLoadingLabel = "Mise à jour…",
  cancelLabel = "Annuler",

  loading = false,
  error = null,

  onConfirm,
  onCancel,
}: ChangePasswordModalProps) {
  const live = useLiveForm<ChangePasswordForm>(changePasswordSchema, {
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const { form, fieldErrors, handleChange, handleBlur, shouldShowFieldError } = live;

  // reset quand on ouvre/ferme, pour éviter de revoir les champs remplis
  useEffect(() => {
    if (!isOpen) {
      live.setForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleConfirm() {
    // force l’affichage des erreurs
    live.touchAll(["currentPassword", "newPassword", "confirmPassword"]);
    const parsed = live.validateAll();
    if (!parsed.ok) return;

    await onConfirm({
      currentPassword: parsed.data.currentPassword,
      newPassword: parsed.data.newPassword,
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) onCancel();
      }}
    >
      <div
        style={{
          width: "min(520px, 100%)",
          background: "white",
          borderRadius: 12,
          padding: 16,
          boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{title}</div>

        <div style={{ fontSize: 14, opacity: 0.85, marginBottom: 12, lineHeight: 1.4 }}>
          Entrez votre mot de passe actuel, puis choisissez un nouveau mot de passe.
        </div>

        <div style={{ display: "grid", gap: 10, marginBottom: 12 }}>
          <PasswordInput
            label="Mot de passe actuel"
            value={form.currentPassword}
            onChange={(e) => handleChange("currentPassword", e.target.value)}
            onBlur={() => handleBlur("currentPassword")}
            autoComplete="current-password"
          />
          {shouldShowFieldError("currentPassword") && fieldErrors.currentPassword ? (
            <MessageBox variant="error">{fieldErrors.currentPassword}</MessageBox>
          ) : null}

          <PasswordInput
            label="Nouveau mot de passe"
            value={form.newPassword}
            onChange={(e) => {
              handleChange("newPassword", e.target.value);
              // si confirm déjà rempli, on revalide visuellement
              if (form.confirmPassword) handleChange("confirmPassword", form.confirmPassword);
            }}
            onBlur={() => handleBlur("newPassword")}
            autoComplete="new-password"
          />
          {shouldShowFieldError("newPassword") && fieldErrors.newPassword ? (
            <MessageBox variant="error">{fieldErrors.newPassword}</MessageBox>
          ) : null}

          <PasswordInput
            label="Confirmer le nouveau mot de passe"
            value={form.confirmPassword}
            onChange={(e) => handleChange("confirmPassword", e.target.value)}
            onBlur={() => handleBlur("confirmPassword")}
            autoComplete="new-password"
          />
          {shouldShowFieldError("confirmPassword") && fieldErrors.confirmPassword ? (
            <MessageBox variant="error">{fieldErrors.confirmPassword}</MessageBox>
          ) : null}
        </div>

        {error ? (
          <div style={{ marginBottom: 12 }}>
            <MessageBox variant="error">{error}</MessageBox>
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>

          <Button variant={"primary" as any} onClick={handleConfirm as any} disabled={loading}>
            {loading ? confirmLoadingLabel : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}