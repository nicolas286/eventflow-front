import { useEffect } from "react";
import Button from "../button/Button";

export function ConfirmDeleteModal(props: {
  open: boolean;
  title: string;
  eventName?: string | null;
  busy?: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { open, title, eventName, busy, error, onCancel, onConfirm } = props;

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  useEffect(() => {
    if (!open) return;
    // lock scroll (simple)
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => {
        // click outside = cancel
        if (e.target === e.currentTarget) onCancel();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(17, 24, 39, 0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 50,
      }}
    >
      <div
        style={{
          width: "min(520px, 100%)",
          background: "#fff",
          borderRadius: 16,
          boxShadow:
            "0 20px 25px -5px rgba(0,0,0,0.15), 0 10px 10px -5px rgba(0,0,0,0.08)",
          padding: 18,
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 900, color: "#111827" }}>
          {title}
        </div>

        <div style={{ marginTop: 10, fontSize: 14, color: "#374151", lineHeight: 1.45 }}>
          Vous êtes sur le point de supprimer{" "}
          <b style={{ color: "#111827" }}>{eventName || "cet événement"}</b>.
          <br />
          Cette action est définitive.
        </div>

        {error && (
          <div
            style={{
              marginTop: 12,
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              color: "#991B1B",
              borderRadius: 12,
              padding: "10px 12px",
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
            marginTop: 16,
          }}
        >
          <Button label="Annuler" onClick={onCancel} disabled={!!busy} variant="secondary">
            Annuler
          </Button>
          <Button
            label={busy ? "Suppression…" : "Supprimer"}
            onClick={onConfirm}
            disabled={!!busy}
            variant="danger"
          >
            {busy ? "Suppression…" : "Supprimer"}
          </Button>
        </div>
      </div>
    </div>
  );
}