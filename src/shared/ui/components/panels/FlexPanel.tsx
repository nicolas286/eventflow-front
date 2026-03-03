import type { ReactNode } from "react";
import "./flexPanel.css";

type Props = {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  state?: "default" | "dirty";
};

export function FlexPanel({
  title,
  subtitle,
  actions,
  children,
  className,
  state = "default",
}: Props) {
  const showMeta = Boolean(subtitle) || state === "dirty";
  const showHeader = Boolean(title) || showMeta || Boolean(actions);

  return (
    <div className={["flexPanel", className].filter(Boolean).join(" ")}>
      {showHeader && (
        <div className="flexPanelHeader">
          <div className="flexPanelHeaderLeft">
            {title && <h3>{title}</h3>}

            {showMeta && (
              <div className="flexPanelSubtitle">
                {subtitle}
                {state === "dirty" && (
                  <span className="dirtyLine">
                    • Modifications non sauvegardées
                  </span>
                )}
              </div>
            )}
          </div>

          {actions && (
            <div className="flexPanelHeaderActions">
              {actions}
            </div>
          )}
        </div>
      )}

      {children}
    </div>
  );
}