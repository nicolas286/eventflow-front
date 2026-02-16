import { useEffect, useState } from "react";
import  Button  from "../button/Button"; // adapte si ton import Button est ailleurs

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

  /** pulse visuel quand ça apparaît */
  pulseOnShow?: boolean;

  /** pour désactiver le bouton save (ex: eventId manquant) */
  disableSave?: boolean;

  className?: string;
};

export default function StickySaveBar({
  show,
  title = "Modifications non sauvegardées",
  hint = "Pense à enregistrer tes changements pour les appliquer.",
  saving = false,
  saveLabel = "Sauvegarder",
  savingLabel = "Sauvegarde…",
  cancelLabel = "Annuler",
  onSave,
  onCancel,
  pulseOnShow = true,
  disableSave = false,
  className = "",
}: Props) {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (!pulseOnShow) return;
    if (!show) return;

    setPulse(true);
    const t = window.setTimeout(() => setPulse(false), 2400);
    return () => window.clearTimeout(t);
  }, [show, pulseOnShow]);

  if (!show) return null;

  return (
    <div className={["adminStickySaveBar", pulse ? "isPulseOnce" : "", className].join(" ")}>
      <div className="adminStickySaveBarInner">
        <div className="adminStickySaveBarLeft">
          <div className="adminStickySaveBarDot" />
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
