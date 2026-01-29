import type { SelectHTMLAttributes } from "react";
import "../../../styles/select.css";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  error?: boolean;
  fullWidth?: boolean;
};

export default function Select({
  className = "",
  error = false,
  fullWidth = true,
  children,
  ...props
}: SelectProps) {
  const wrapperClass =
    "uiSelect" +
    (fullWidth ? " uiSelect--full" : "") +
    (error ? " uiSelect--error" : "");

  return (
    <div className={wrapperClass}>
      <select
        className={`uiSelect__control ${className}`}
        {...props}
      >
        {children}
      </select>

      {/* chevron */}
      <span className="uiSelect__chevron" aria-hidden />
    </div>
  );
}
