import { useEffect, useMemo, useRef, useState } from "react";
import Button from "../../components/button/Button"
import "../../../styles/desktop/editorShell.css";

type AnimState = "closed" | "open" | "closing";

type Props = {
  isOpen: boolean;
  onRequestClose?: () => void;

  editorWidth?: number; // px
  editorGap?: number; // px
  stickyTop?: number; // px

  /** sticky = position:sticky ; fixed = position:fixed (robuste si sticky cassé par un parent) */
  mode?: "sticky" | "fixed";

  left: React.ReactNode;
  right: React.ReactNode;

  className?: string;
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

export function EditorShell({
  isOpen,
  onRequestClose,
  editorWidth = 420,
  editorGap = 14,
  stickyTop = 84,
  mode = "sticky",
  left,
  right,
  className,
}: Props) {
  const [anim, setAnim] = useState<AnimState>("closed");
  const prevIsOpenRef = useRef<boolean>(false);
  const closeTimerRef = useRef<number | null>(null);

  const shellRef = useRef<HTMLDivElement | null>(null);

  // Animation open/close
  useEffect(() => {
    const wasOpen = prevIsOpenRef.current;
    prevIsOpenRef.current = isOpen;

    if (isOpen) {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
      setAnim("open");
      return;
    }

    if (wasOpen) {
      setAnim("closing");
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = window.setTimeout(() => {
        setAnim("closed");
      }, 180);
    } else {
      setAnim("closed");
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  // ✅ Pour mode="fixed": on calcule le "right offset" pour aligner le panel au bord droit du shell
  useEffect(() => {
    if (mode !== "fixed") return;

    const el = shellRef.current;
    if (!el) return;

    const update = () => {
      const r = el.getBoundingClientRect();
      // distance entre le bord droit du shell et le bord droit de la fenêtre
      const rightOffset = Math.max(0, Math.round(window.innerWidth - r.right));
      el.style.setProperty("--editor-fixed-right", `${rightOffset}px`);
    };

    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, { passive: true });

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update);
    };
  }, [mode]);

  const shellOpen = isOpen || anim === "closing";
  const showPanel = anim !== "closed";

  const styleVars = useMemo(
    () =>
      ({
        ["--editor-w" as any]: `${editorWidth}px`,
        ["--editor-gap" as any]: `${editorGap}px`,
        ["--editor-sticky-top" as any]: `${stickyTop}px`,
      }) as React.CSSProperties,
    [editorWidth, editorGap, stickyTop]
  );

  return (
    <div
      ref={shellRef}
      className={[
        "uiEditorShell",
        shellOpen ? "isEditorOpen" : "",
        mode === "fixed" ? "isFixed" : "",
        className ?? "",
      ].join(" ")}
      style={styleVars}
    >
      <div className="uiEditorLeft">{left}</div>

      <div className="uiEditorRight">
        {showPanel ? (
          <div
            className={[
              "uiEditorPanel",
              mode === "fixed" ? "isFixed" : "isSticky",
              anim === "open" ? "isOpen" : "",
              anim === "closing" ? "isClosing" : "",
            ].join(" ")}
          >
            {onRequestClose ? (
              <Button
                type="button"
                className="uiEditorCloseBtn"
                variant="ghost"
                onClick={onRequestClose}
                aria-label="Fermer"
              >
                <CloseIcon />
              </Button>
            ) : null}

            {right}
          </div>
        ) : null}
      </div>
    </div>
  );
}
