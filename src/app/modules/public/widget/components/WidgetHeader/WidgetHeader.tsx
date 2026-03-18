import type { ReactNode } from "react";
import "./WidgetHeader.css"; 

type Props = {
  left?: ReactNode;
  title?: ReactNode;
};

export function WidgetHeader({ left, title }: Props) {
  return (
    <div className="widgetHeader">
      {left && <div className="widgetHeaderLeft">{left}</div>}
      {title && <h2 className="widgetHeaderTitle">{title}</h2>}
    </div>
  );
}