import type { ChangeEventHandler, InputHTMLAttributes, ReactNode } from "react";
import "../../../styles/desktop/input.desktop.css";
import "../../../styles/mobile/input.mobile.css";

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> & {
  label?: ReactNode;
  value?: string | number | readonly string[];
  onChange?: ChangeEventHandler<HTMLInputElement>;
  type?: string;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
};

export default function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  className = "",
  inputClassName = "",
  required,
  ...rest
}: InputProps) {
  return (
    <label className={["ui-field", className].filter(Boolean).join(" ")}>
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

      <input
        className={["ui-input", inputClassName].filter(Boolean).join(" ")}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        aria-required={required}
        {...rest}
      />
    </label>
  );
}
