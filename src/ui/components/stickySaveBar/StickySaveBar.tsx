import Button from "../button/Button";
import "./stickySaveBar.css";

type Props = {
  show: boolean;

  title?: string;
  hint?: string;

  saving?: boolean;
  saveLabel?: string;
  savingLabel?: string;

  cancelLabel?: string;

  onSave: () => void | Promise<void>;
  onCancel?: () => void;

  pulseOnShow?: boolean;
  disableSave?: boolean;

  className?: string;
};

export default function StickySaveBar({
  show,
  title = "Modifications non sauvegardées",
  hint = "Enregistrez vos changements pour les appliquer.",
  saving = false,
  saveLabel = "Enregistrer",
  savingLabel = "Enregistrement…",
  cancelLabel = "Annuler",
  onSave,
  onCancel,
  pulseOnShow = true,
  disableSave = false,
  className = "",
}: Props) {
  if (!show) return null;

  const rootClass = [
    "adminStickySaveBar",
    pulseOnShow ? "isPulseOnMount" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClass} role="status" aria-live="polite">
      <div className="adminStickySaveBarInner">
        <div className="adminStickySaveBarLeft">
          <div className="adminStickySaveBarDot" aria-hidden="true" />
          <div className="adminStickySaveBarText">
            <div className="adminStickySaveBarTitle">{title}</div>
            {hint ? <div className="adminStickySaveBarHint">{hint}</div> : null}
          </div>
        </div>

        <div className="adminStickySaveBarActions">
          {onCancel ? (
            <Button variant="secondary" onClick={onCancel} disabled={saving}>
              {cancelLabel}
            </Button>
          ) : null}

          <Button onClick={onSave} disabled={saving || disableSave}>
            {saving ? savingLabel : saveLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}