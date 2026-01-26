import "../../../styles/button.css"

type Props = {
    label?: string;
    children?: React.ReactNode;
    variant?: "primary" | "secondary" | "ghost" | "danger";
    type?: "button" | "submit" | "reset";
    disabled?: boolean;
    className?: string;
    onClick?: () => void;
}

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
      onClick={onClick}
      {...rest}
    >
      {children ?? label}
    </button>
  );
}