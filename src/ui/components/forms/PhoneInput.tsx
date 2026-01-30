import React, { useEffect, useMemo, useState } from "react";
import { COUNTRY_OPTIONS, parseE164, buildE164 } from "./countryPhoneData";

type Props = {
  /** valeur e164 actuelle (ex: "+33612345678") ou autre texte ; null/"" autorisé */
  value: string | null | undefined;

  /** on renvoie une valeur e164 (ex "+33612345678") ou "" si vide */
  onChange: (next: string) => void;

  /** permet de garder tes classes existantes */
  groupClassName?: string;
  selectClassName?: string;
  inputClassName?: string;

  /** permet de garder tes styles inline existants */
  selectStyle?: React.CSSProperties;
  inputStyle?: React.CSSProperties;

  defaultDial?: string;
  placeholder?: string;
};

export default function PhoneInput({
  value,
  onChange,
  groupClassName,
  selectClassName,
  inputClassName,
  selectStyle,
  inputStyle,
  defaultDial = "+32",
  placeholder = "Numéro",
}: Props) {
  const initial = useMemo(() => parseE164(value ?? ""), [value]);
  const [dial, setDial] = useState<string>(initial.dial || defaultDial);
  const [national, setNational] = useState<string>(initial.national);

  // resync doux quand la valeur externe change
  useEffect(() => {
    const p = parseE164(value ?? "");
    if (p.dial) setDial(p.dial);
    else setDial(defaultDial);
    setNational(p.national);
  }, [value, defaultDial]);

  return (
    <div className={groupClassName}>
      <select
        className={selectClassName}
        value={dial}
        onChange={(e) => {
          const nextDial = e.target.value;
          setDial(nextDial);
          onChange(buildE164(nextDial, national));
        }}
        style={selectStyle}
        aria-label="Indicatif"
      >
        {COUNTRY_OPTIONS.map((c) => (
          <option key={`${c.iso2}-${c.dial}`} value={c.dial}>
            {c.flag} {c.dial}
          </option>
        ))}
      </select>

      <input
        className={inputClassName}
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
      />
    </div>
  );
}
