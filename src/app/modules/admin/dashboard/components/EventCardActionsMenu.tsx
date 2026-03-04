import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@ui/components";

import {
  CopyIcon,
  NotepadIcon,
  FacebookIcon,
  EditIcon,
  CloseIcon,
  TrashIcon,
} from "@ui/components/icon/Icons";

type MenuItem =
  | {
      kind: "link";
      key: string;
      label: string;
      icon: React.ReactNode;
      to: string;
      disabled?: boolean;
    }
  | {
      kind: "action";
      key: string;
      label: string;
      icon: React.ReactNode;
      tone?: "default" | "danger";
      onClick: () => void | Promise<void>;
      disabled?: boolean;
    };

type Props = {
  canView: boolean;
  detailsTo?: string;

  isSelected: boolean;

  onToggleInlineEdit: () => void;
  onCopyLink?: () => void | Promise<void>;
  onShareFacebook?: () => void;
  onDelete: () => void;

  /** optionnel: pour renommer le bouton */
  buttonLabel?: string;
};

export default function EventCardActionsMenu({
  canView,
  detailsTo,
  isSelected,
  onToggleInlineEdit,
  onCopyLink,
  onShareFacebook,
  onDelete,
  buttonLabel = "Actions",
}: Props) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);

  const items: MenuItem[] = useMemo(() => {
    const base: MenuItem[] = [];

    if (canView && detailsTo) {
      base.push({
        kind: "link",
        key: "details",
        label: "Voir les détails",
        icon: <NotepadIcon />,
        to: detailsTo,
      });
    }

    if (canView && onShareFacebook) {
      base.push({
        kind: "action",
        key: "shareFb",
        label: "Partager sur Facebook",
        icon: <FacebookIcon />,
        onClick: onShareFacebook,
      });
    }

    if (canView && onCopyLink) {
      base.push({
        kind: "action",
        key: "copyLink",
        label: "Copier le lien public",
        icon: <CopyIcon />,
        onClick: onCopyLink,
      });
    }

    base.push({
      kind: "action",
      key: "toggleEdit",
      label: isSelected ? "Fermer la modification rapide" : "Modification rapide",
      icon: isSelected ? <CloseIcon /> : <EditIcon />,
      onClick: onToggleInlineEdit,
    });

    base.push({
      kind: "action",
      key: "delete",
      label: "Supprimer",
      icon: <TrashIcon />,
      tone: "danger",
      onClick: onDelete,
    });

    return base;
  }, [canView, detailsTo, isSelected, onCopyLink, onShareFacebook, onToggleInlineEdit, onDelete]);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!open) return;
      const target = e.target as Node;
      if (rootRef.current && !rootRef.current.contains(target)) setOpen(false);
    }

    function onDocKeyDown(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onDocKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onDocKeyDown);
    };
  }, [open]);

  return (
    <div className="eventCardActions" ref={rootRef}>
      <Button
        variant="secondary"
        className="eventCardActions__trigger"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        title="Ouvrir les actions"
      >
        {buttonLabel}
      </Button>

      {open && (
        <div
          id={menuId}
          className="eventCardActions__menu"
          role="menu"
          aria-label="Actions de l'événement"
          onClick={(e) => e.stopPropagation()}
        >
          {items.map((it) => {
            const toneClass = it.kind === "action" && it.tone === "danger" ? "isDanger" : "";

            if (it.kind === "link") {
              return (
                <Link
                  key={it.key}
                  to={it.to}
                  className={`eventCardActions__item ${toneClass} ${it.disabled ? "isDisabled" : ""}`}
                  role="menuitem"
                  aria-disabled={it.disabled ? true : undefined}
                  tabIndex={0}
                  onClick={() => setOpen(false)}
                >
                  <span className="eventCardActions__icon">{it.icon}</span>
                  <span className="eventCardActions__label">{it.label}</span>
                </Link>
              );
            }

            return (
              <button
                key={it.key}
                type="button"
                className={`eventCardActions__item ${toneClass} ${it.disabled ? "isDisabled" : ""}`}
                role="menuitem"
                disabled={it.disabled}
                onClick={() => {
                  const r = it.onClick();
                  setOpen(false);
                  // si action async, on laisse tourner sans bloquer l'UI
                  void r;
                }}
              >
                <span className="eventCardActions__icon">{it.icon}</span>
                <span className="eventCardActions__label">{it.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}