import type { ReactNode } from "react";
import Button from "../button/Button";

type ConfirmIntent = "primary" | "danger";

type ConfirmModalProps = {
  isOpen: boolean;

  title: ReactNode;
  children: ReactNode; 

  confirmLabel?: ReactNode;
  confirmLoadingLabel?: ReactNode;
  cancelLabel?: ReactNode;

  intent?: ConfirmIntent;

  loading?: boolean;
  error?: ReactNode;

  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

export function ConfirmModal({
  isOpen,
  title,
  children,

  confirmLabel = "Confirmer",
  confirmLoadingLabel = "Confirmation…",
  cancelLabel = "Annuler",

  intent = "primary",
  loading = false,
  error = null,

  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const confirmVariant = intent === "danger" ? "danger" : "primary";

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
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
          {title}
        </div>

        <div style={{ fontSize: 14, opacity: 0.85, marginBottom: 12, lineHeight: 1.4 }}>
          {children}
        </div>

        {error ? (
          <div
            style={{
              background: "rgba(255,0,0,0.06)",
              border: "1px solid rgba(255,0,0,0.12)",
              color: "#b00020",
              borderRadius: 10,
              padding: "10px 12px",
              fontSize: 13,
              marginBottom: 12,
            }}
          >
            {error}
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>

          <Button
            variant={confirmVariant as any}
            onClick={onConfirm as any}
            disabled={loading}
          >
            {loading ? confirmLoadingLabel : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
