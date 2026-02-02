import type { ReactNode, HTMLAttributes } from "react";
import "../../../styles/desktop/container.desktop.css"

export type ContainerProps = HTMLAttributes<HTMLDivElement> & {
  children?: ReactNode;
  className?: string;
};

export default function Container({
  children,
  className = "",
  ...rest
}: ContainerProps) {
  return (
    <div className={["ui-container", className].filter(Boolean).join(" ")} {...rest}>
      {children}
    </div>
  );
}
