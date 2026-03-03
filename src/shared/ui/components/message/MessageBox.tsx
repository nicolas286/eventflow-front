import "./messageBox.css";


type Props = {
    variant: "error" | "success" | "info";
    children: React.ReactNode;
};

export function MessageBox({
  variant,
  children,
}: Props) {
  const className =
    variant === "error"
      ? "message message--error"
      : variant === "success"
        ? "message message--success"
        : "message message--info";

  return <div className={className} role={variant === "error" ? "alert" : "status"}>{children}</div>;
}