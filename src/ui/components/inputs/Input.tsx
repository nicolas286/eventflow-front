import type { ChangeEventHandler, InputHTMLAttributes, ReactNode } from "react";
import "../../../styles/input.css";

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
  ...rest
}: InputProps) {
  return (
    <label className={["ui-field", className].filter(Boolean).join(" ")}>
      {label ? <div className="ui-field__label">{label}</div> : null}
      <input
        className={["ui-input", inputClassName].filter(Boolean).join(" ")}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        {...rest}
      />
    </label>
  );
}
