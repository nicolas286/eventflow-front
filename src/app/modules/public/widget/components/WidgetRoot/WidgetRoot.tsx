import type { WidgetTheme } from "../../hooks/useWidgetTheme";
import type { ReactNode, CSSProperties } from "react";
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
      style={
        {
          "--widget-bg": theme.bg,
          "--widget-card": theme.card,
          "--widget-text": theme.text,
          "--widget-button": theme.button,
          "--widget-input-bg": theme.inputBg,
          "--widget-input-border": theme.inputBorder,
          "--widget-input-placeholder": theme.inputPlaceholder,
          "--widget-input-focus-ring": theme.inputFocusRing,
        } as CSSProperties
      }
    >
      <div className="widgetRootInner">
        {children}
      </div>
    </div>
  );
}