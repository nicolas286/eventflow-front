import { useEffect, useState } from "react";
import  Button  from "../button/Button";

type Props = {
  isOpen: boolean;
  onRequestClose: () => void;

  left: React.ReactNode;
  right: React.ReactNode;

  editorWidth?: number; // px
  editorGap?: number; // px
  stickyTop?: number; // px (navbar + marge)
  className?: string;

  /** optionnel: masquer la croix si tu veux gérer toi-même */
  showCloseButton?: boolean;
};

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M18 6 6 18M6 6l12 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  EditorShell : shrink list à gauche + panel à droite (sticky)        */
/*  + animation in/out + bouton close top-right                         */
/* ------------------------------------------------------------------ */
export function EditorShell({
  isOpen,
  onRequestClose,
  left,
  right,
  editorWidth = 420,
  editorGap = 14,
  stickyTop = 84,
  className,
  showCloseButton = true,
}: Props) {
  const [mounted, setMounted] = useState(isOpen);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      setClosing(false);
      return;
    }
    if (mounted) setClosing(true);
  }, [isOpen, mounted]);

  function onAnimationEnd() {
    if (!isOpen) {
      setMounted(false);
      setClosing(false);
    }
  }

  const shellOpen = isOpen || mounted;
  const panelClass = isOpen ? "isOpen" : closing ? "isClosing" : "";

  return (
    <div
      className={[
        "uiEditorShell",
        shellOpen ? "isEditorOpen" : "",
        className ?? "",
      ].join(" ")}
      style={
        {
          ["--editor-w" as any]: `${editorWidth}px`,
          ["--editor-gap" as any]: `${editorGap}px`,
          ["--sticky-top" as any]: `${stickyTop}px`,
        } as React.CSSProperties
      }
    >
      <div className="uiEditorLeft">{left}</div>

      <div className="uiEditorRight">
        {mounted ? (
          <div
            className={["uiEditorPanel", panelClass].join(" ")}
            onAnimationEnd={onAnimationEnd}
          >
            <div className="uiEditorPanelInner">
              {showCloseButton ? (
                <Button
                  variant="ghost"
                  className="uiEditorCloseBtn"
                  onClick={onRequestClose}
                  aria-label="Fermer"
                >
                  <CloseIcon />
                </Button>
              ) : null}

              {right}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
