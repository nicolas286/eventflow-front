import { Button } from "../../../ui/components";

type Step = 1 | 2 | 3;

type Props = {
  step: Step;
  onRequestClose: () => void;

  loading: boolean;

  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;

  canGoNext: boolean;     // step 1/2
  canSubmit: boolean;     // step 3
  submitLabel?: string;   // optionnel
};

export function AdminCreateOrderFooter({
  step,
  onRequestClose,
  loading,
  onBack,
  onNext,
  onSubmit,
  canGoNext,
  canSubmit,
  submitLabel,
}: Props) {
  const isLast = step === 3;

  return (
    <div
      style={{
        padding: 14,
        borderTop: "1px solid rgba(0,0,0,0.08)",
        display: "flex",
        justifyContent: "space-between",
        gap: 10,
      }}
    >
      <Button variant="secondary" onClick={onRequestClose} disabled={loading}>
        Fermer
      </Button>

      <div style={{ display: "flex", gap: 10 }}>
        {step > 1 ? (
          <Button variant="secondary" onClick={onBack} disabled={loading}>
            Retour
          </Button>
        ) : null}

        {!isLast ? (
          <Button variant="primary" onClick={onNext} disabled={loading || !canGoNext}>
            Continuer
          </Button>
        ) : (
          <Button variant="primary" onClick={onSubmit} disabled={loading || !canSubmit}>
            {submitLabel ?? (loading ? "Création…" : "Créer la commande")}
          </Button>
        )}
      </div>
    </div>
  );
}
