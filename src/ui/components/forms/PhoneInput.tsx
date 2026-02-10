import React, { useEffect, useMemo, useState } from "react";
import { COUNTRY_OPTIONS, parseE164, buildE164 } from "./countryPhoneData";
import "../../../styles/desktop/input.desktop.css";
import "../../../styles/mobile/input.mobile.css";

type Props = {
  /** valeur e164 actuelle (ex: "+33612345678") ou autre texte ; null/"" autorisé */
  value: string | null | undefined;

  /** on renvoie une valeur e164 (ex "+33612345678") ou "" si vide */
  onChange: (next: string) => void;

  /** label comme Input */
  label?: React.ReactNode;

  /** required comme Input */
  required?: boolean;

  /** wrapper + classes optionnelles */
  className?: string;        // wrapper ui-field
  groupClassName?: string;   // row container (inline)
  selectClassName?: string;  // extra classes sur select
  inputClassName?: string;   // extra classes sur input

  /** styles inline optionnels */
  selectStyle?: React.CSSProperties;
  inputStyle?: React.CSSProperties;

  defaultDial?: string;
  placeholder?: string;

  disabled?: boolean;
  name?: string; // (optionnel) utile si tu veux un name sur l'input national
};

export default function PhoneInput({
  value,
  onChange,
  label,
  required = false,
  className = "",
  groupClassName = "",
  selectClassName = "",
  inputClassName = "",
  selectStyle,
  inputStyle,
  defaultDial = "+32",
  placeholder = "Numéro",
  disabled = false,
  name,
}: Props) {
  const initial = useMemo(() => parseE164(value ?? ""), [value]);
  const [dial, setDial] = useState<string>(initial.dial || defaultDial);
  const [national, setNational] = useState<string>(initial.national);

  // resync doux quand la valeur externe change
  useEffect(() => {
    const p = parseE164(value ?? "");
    setDial(p.dial || defaultDial);
    setNational(p.national);
  }, [value, defaultDial]);

  const isEmpty = national.trim() === "";
  const isInvalidRequired = required && isEmpty;

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

      <div className={["ui-phoneRow", groupClassName].filter(Boolean).join(" ")}>
        <select
          className={["ui-input", "ui-phoneRow__dial", selectClassName].filter(Boolean).join(" ")}
          value={dial}
          onChange={(e) => {
            const nextDial = e.target.value;
            setDial(nextDial);
            onChange(buildE164(nextDial, national));
          }}
          style={selectStyle}
          aria-label="Indicatif"
          disabled={disabled}
        >
          {COUNTRY_OPTIONS.map((c) => (
            <option key={`${c.iso2}-${c.dial}`} value={c.dial}>
              {c.flag} {c.dial}
            </option>
          ))}
        </select>

        <input
          name={name}
          className={["ui-input", "ui-phoneRow__number", inputClassName].filter(Boolean).join(" ")}
          value={national}
          onChange={(e) => {
            const nextNational = e.target.value;
            setNational(nextNational);
            onChange(buildE164(dial, nextNational));
          }}
          inputMode="tel"
          placeholder={placeholder}
          aria-label="Numéro de téléphone"
          style={inputStyle}
          disabled={disabled}
          required={required}
          aria-required={required}
          aria-invalid={isInvalidRequired}
        />
      </div>
    </label>
  );
}
