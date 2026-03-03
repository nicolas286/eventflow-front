import "../../../styles/desktop/termsModal.desktop.css"
import Button from "../button/Button";

type Props = {
    open: boolean;
    onClose: () => void;
}

export function TermsModal({
  open,
  onClose,
}: 
  Props) {
  if (!open) return null;

  return (
    <div className="terms-modal-overlay" role="dialog" aria-modal="true" aria-label="Conditions">
      <div className="terms-modal">
        <div className="terms-modal-header">
          <h3 className="terms-modal-title">Conditions</h3>
          <button type="button" className="terms-modal-close" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>

        <div className="terms-modal-body">
          <p>Contenu à venir…</p>
        </div>

        <div className="terms-modal-footer">
          <Button type="button" variant="primary" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </div>
    </div>
  );
}