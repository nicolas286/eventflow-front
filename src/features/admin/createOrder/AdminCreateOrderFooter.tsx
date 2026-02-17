import { Button } from "../../../ui/components";

type Step = 1 | 2 | 3;

type Props = {
  step: Step;
  loading: boolean;

  onRequestClose: () => void;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;

  canGoNext: boolean;
  canSubmit: boolean;
};

export function AdminCreateOrderFooter({
  step,
  loading,
  onRequestClose,
  onBack,
  onNext,
  onSubmit,
  canGoNext,
  canSubmit,
}: Props) {
  const isLast = step === 3;

  return (
    <div className="adminCreateOrderFooter">
      <div className="adminCreateOrderFooterLeft">
        <Button variant="secondary" onClick={onRequestClose} disabled={loading}>
          Fermer
        </Button>

        <Button variant="secondary" onClick={onBack} disabled={loading || step === 1}>
          Retour
        </Button>
      </div>

      <div className="adminCreateOrderFooterRight">
        {!isLast ? (
          <Button variant="primary" onClick={onNext} disabled={loading || !canGoNext}>
            Suivant
          </Button>
        ) : (
          <Button variant="primary" onClick={onSubmit} disabled={loading || !canSubmit}>
            {loading ? "Création…" : "Créer"}
          </Button>
        )}
      </div>
    </div>
  );
}
