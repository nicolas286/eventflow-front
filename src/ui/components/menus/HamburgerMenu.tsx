import { type ReactNode, useEffect, useRef, useState } from "react";
import "../../../styles/hamburgerMenu.css";

export type HamburgerMenuChildren =
  | ReactNode
  | ((close: () => void) => ReactNode);

export type HamburgerMenuProps = {
  children?: HamburgerMenuChildren;
  ariaLabel?: string;
};

export default function HamburgerMenu({
  children,
  ariaLabel = "Menu",
}: HamburgerMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Ferme si clic extérieur
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!rootRef.current) return;
      const target = e.target as Node | null;
      if (target && !rootRef.current.contains(target)) setOpen(false);
    }
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, []);

  // Ferme avec Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="hamburgerMenu" ref={rootRef}>
      <button
        className={`hamburgerMenu__button ${open ? "isOpen" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={ariaLabel}
        aria-expanded={open ? "true" : "false"}
        type="button"
      >
        <span className="hamburgerMenu__bar" />
        <span className="hamburgerMenu__bar" />
        <span className="hamburgerMenu__bar" />
      </button>

      <div className={`hamburgerMenu__panel ${open ? "isOpen" : ""}`}>
        {typeof children === "function"
          ? children(() => setOpen(false))
          : children}
      </div>
    </div>
  );
}

/* ---------- Helpers UI (optionnels, mais pratiques) ---------- */

export type MenuHeaderProps = { children?: ReactNode };

export function MenuHeader({ children }: MenuHeaderProps) {
  return <div className="hamburgerMenu__header">{children}</div>;
}

export function MenuDivider() {
  return <div className="hamburgerMenu__divider" />;
}

export type MenuItemProps = {
  label: ReactNode;
  hint?: ReactNode;
  onClick?: React.ButtonHTMLAttributes<HTMLButtonElement>["onClick"];
};

export function MenuItem({ label, hint, onClick }: MenuItemProps) {
  return (
    <button className="hamburgerMenu__item" onClick={onClick} type="button">
      <span className="hamburgerMenu__label">
        <span className="hamburgerMenu__labelMain">{label}</span>
        {hint ? <span className="hamburgerMenu__hint">{hint}</span> : null}
      </span>
    </button>
  );
}

export type MenuToggleProps = {
  label: ReactNode;
  value: boolean;
  onToggle?: () => void;
};

export function MenuToggle({ label, value, onToggle }: MenuToggleProps) {
  return (
    <button
      className="hamburgerMenu__item hamburgerMenu__itemRow"
      onClick={onToggle}
      type="button"
    >
      <span className="hamburgerMenu__labelMain">{label}</span>

      <span className="hamburgerMenu__toggle" aria-hidden="true">
        <span className={`hamburgerMenu__dot ${value ? "isOn" : ""}`} />
      </span>
    </button>
  );
}