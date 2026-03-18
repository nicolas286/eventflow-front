import type { WidgetTheme } from "../../hooks/useWidgetTheme";
import type { ReactNode } from "react";
import "./WidgetRoot.css"; 

type Props = {
  theme: WidgetTheme;
  children?: ReactNode;
};

export function WidgetRoot({ theme, children }: Props) {
  return (
    <div
      id="eventflow-widget-root"
      className="widgetRoot"
      style={{
        "--widget-bg": theme.bg,
        "--widget-card": theme.card,
        "--widget-text": theme.text,
        "--widget-button": theme.button,
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
}