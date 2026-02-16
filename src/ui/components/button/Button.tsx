import "../../../styles/desktop/button.desktop.css";
import type { ButtonHTMLAttributes, ReactNode, MouseEventHandler } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  label?: string;
  children?: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

export default function Button({
  label,
  children,
  variant = "primary",
  type = "button",
  disabled = false,
  className = "",
  onClick,
  ...rest
}: Props) {
  const classes = [
    "ui-button",
    `ui-button--${variant}`,
    disabled ? "ui-button--disabled" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled}
      onClick={onClick as MouseEventHandler<HTMLButtonElement> | undefined}
      {...rest}
    >
      {children ?? label}
    </button>
  );
}
