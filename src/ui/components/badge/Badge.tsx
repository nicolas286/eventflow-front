import type { ReactNode } from "react";
import "../../../styles/badge.css"

export type BadgeTone = "neutral" | "success" | "warn" | "danger" | "info";

export type BadgeProps = {
  label?: string;
  children?: ReactNode;
  tone?: BadgeTone;
  className?: string;
};

export default function Badge({
  label,
  children,
  tone = "neutral",
  className = "",
}: BadgeProps) {
  return (
    <span
      className={["ui-badge", `ui-badge--${tone}`, className]
        .filter(Boolean)
        .join(" ")}
    >
      {children ?? label}
    </span>
  );
}