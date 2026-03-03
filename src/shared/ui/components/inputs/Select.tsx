import type { SelectHTMLAttributes, ReactNode } from "react";
import "./input.desktop.css";
import "./input.mobile.css";
import "./select.desktop.css";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: ReactNode;
  required?: boolean;

  error?: boolean;
  fullWidth?: boolean;

  className?: string;
  selectClassName?: string;
};

export default function Select({
  label,
  required,
  error = false,
  fullWidth = true,
  className = "",
  selectClassName = "",
  children,
  ...props
}: SelectProps) {
  const wrapperClass = [
    "ui-field",
    fullWidth ? "uiSelect--full" : "",
    error ? "uiSelect--error" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <label className={wrapperClass}>
      {label ? (
        <div className="ui-field__label">
          <span className="ui-field__labelText">{label}</span>
          {required ? (
            <span className="ui-field__required" aria-hidden>
              *
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="uiSelect">
        <select
          className={["ui-input", "uiSelect__control", selectClassName]
            .filter(Boolean)
            .join(" ")}
          required={required}
          aria-required={required}
          {...props}
        >
          {children}
        </select>

        {/* chevron */}
        <span className="uiSelect__chevron" aria-hidden />
      </div>
    </label>
  );
}
