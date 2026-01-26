import type { ReactNode, HTMLAttributes } from "react";
import "../../../styles/card.css"

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  children?: ReactNode;
  className?: string;
};

export default function Card({ children, className = "", ...rest }: CardProps) {
  return (
    <div className={["ui-card", className].filter(Boolean).join(" ")} {...rest}>
      {children}
    </div>
  );
}

export type CardHeaderProps = {
  title?: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  className?: string;
};

export function CardHeader({
  title,
  subtitle,
  right,
  className = "",
}: CardHeaderProps) {
  return (
    <div className={["ui-cardHeader", className].filter(Boolean).join(" ")}>
      <div className="ui-cardHeader__left">
        {title ? <div className="ui-cardHeader__title">{title}</div> : null}
        {subtitle ? (
          <div className="ui-cardHeader__subtitle">{subtitle}</div>
        ) : null}
      </div>
      {right ? <div className="ui-cardHeader__right">{right}</div> : null}
    </div>
  );
}

export type CardBodyProps = HTMLAttributes<HTMLDivElement> & {
  children?: ReactNode;
  className?: string;
};

export function CardBody({ children, className = "", ...rest }: CardBodyProps) {
  return (
    <div
      className={["ui-cardBody", className].filter(Boolean).join(" ")}
      {...rest}
    >
      {children}
    </div>
  );
}