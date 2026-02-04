import React, { useMemo } from "react";
import { COUNTRY_OPTIONS } from "./countryPhoneData";
import "../../../styles/desktop/input.desktop.css";

type Props = {
  value: string;
  onChange: (next: string) => void;

  label?: React.ReactNode;

  className?: string;        // wrapper ui-field
  selectClassName?: string;  // select ui-input
  style?: React.CSSProperties;

  placeholder?: string;
  keepUnknownValue?: boolean;

  required?: boolean;
  disabled?: boolean;
  name?: string;
};

export default function CountrySelect({
  value,
  onChange,
  label,
  className = "",
  selectClassName = "",
  style,
  placeholder = "Sélectionner un pays",
  keepUnknownValue = true,
  required,
  disabled = false,
  name,
}: Props) {
  const v = value ?? "";

  const hasUnknown = useMemo(() => {
    if (!v) return false;
    const lower = v.trim().toLowerCase();
    return !COUNTRY_OPTIONS.some((c) => c.label.toLowerCase() === lower);
  }, [v]);

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

      <select
        name={name}
        className={["ui-input", selectClassName].filter(Boolean).join(" ")}
        value={v}
        onChange={(e) => onChange(e.target.value)}
        style={style}
        required={required}
        aria-required={required}
        disabled={disabled}
      >
        <option value="" disabled={!!required} hidden={!!required}>
          {placeholder}
        </option>

        {keepUnknownValue && hasUnknown ? <option value={v}>{v}</option> : null}

        {COUNTRY_OPTIONS.map((c) => (
          <option key={c.iso2} value={c.label}>
            {c.flag} {c.label}
          </option>
        ))}
      </select>
    </label>
  );
}
