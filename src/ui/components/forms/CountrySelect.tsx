import React, { useMemo } from "react";
import { COUNTRY_OPTIONS } from "./countryPhoneData";

type Props = {
  value: string;
  onChange: (next: string) => void;

  /** Permet de réutiliser tes classes actuelles (profilePanel__select / etc.) */
  className?: string;

  /** Permet de réutiliser tes styles inline actuels */
  style?: React.CSSProperties;

  /** placeholder option */
  placeholder?: string;

  /** si value n'est pas dans la liste, on la montre quand même */
  keepUnknownValue?: boolean;
};

export default function CountrySelect({
  value,
  onChange,
  className,
  style,
  placeholder = "Sélectionner un pays",
  keepUnknownValue = true,
}: Props) {
  const v = value ?? "";

  const hasUnknown = useMemo(() => {
    if (!v) return false;
    const lower = v.trim().toLowerCase();
    return !COUNTRY_OPTIONS.some((c) => c.label.toLowerCase() === lower);
  }, [v]);

  return (
    <select
      className={className}
      value={v}
      onChange={(e) => onChange(e.target.value)}
      style={style}
      aria-label="Pays"
    >
      <option value="">{placeholder}</option>

      {keepUnknownValue && hasUnknown ? <option value={v}>{v}</option> : null}

      {COUNTRY_OPTIONS.map((c) => (
        <option key={c.iso2} value={c.label}>
          {c.flag} {c.label}
        </option>
      ))}
    </select>
  );
}
