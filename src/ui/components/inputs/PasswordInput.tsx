import { useState } from "react";
import type { ChangeEventHandler, InputHTMLAttributes, ReactNode } from "react";

import "../../../styles/desktop/input.desktop.css";
import "../../../styles/mobile/input.mobile.css";

import { EyeIcon, EyeOffIcon } from "../icon/Icons";

export type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "type"> & {
  label?: ReactNode;
  value?: string | number | readonly string[];
  onChange?: ChangeEventHandler<HTMLInputElement>;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  defaultVisible?: boolean;
};

export default function PasswordInput({
  label,
  value,
  onChange,
  placeholder,
  className = "",
  inputClassName = "",
  required,
  defaultVisible = false,
  ...rest
}: PasswordInputProps) {
  const [visible, setVisible] = useState(defaultVisible);

  return (
    <div className={["ui-field", "ui-passwordField", className].filter(Boolean).join(" ")}>
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

      <div className="ui-passwordField__control">
        <input
          className={["ui-input", "ui-passwordField__input", inputClassName].filter(Boolean).join(" ")}
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          aria-required={required}
          {...rest}
        />

        <button
          type="button"
          className="ui-passwordField__toggle"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    </div>
  );
}