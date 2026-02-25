import type { ChangeEventHandler, InputHTMLAttributes, ReactNode } from "react";
import { useMemo, useState } from "react";
import "../../../styles/desktop/input.desktop.css";
import "../../../styles/mobile/input.mobile.css";

export type InputValueChange =
  | { kind: "raw"; raw: string }
  | { kind: "priceDraft"; raw: string }
  | { kind: "priceCommit"; raw: string; cents: number };

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & {
  label?: ReactNode;
  value?: string | number | readonly string[];
  onChange?: ChangeEventHandler<HTMLInputElement>;
  onValueChange?: (v: InputValueChange) => void;

  type?: string;
  placeholder?: string;
  className?: string;
  inputClassName?: string;

  format?: "none" | "price";
  priceLocale?: "fr" | "en";
};

function sanitizePriceInput(input: string) {
  let v = input.replace(/\s+/g, "").replace(/[^0-9.,]/g, "");
  const firstSepIndex = v.search(/[.,]/);
  if (firstSepIndex !== -1) {
    const before = v.slice(0, firstSepIndex + 1);
    const after = v.slice(firstSepIndex + 1).replace(/[.,]/g, "");
    v = before + after;
  }
  return v;
}

function parsePriceToCents(raw: string): number | null {
  const s = raw.trim();
  if (!s) return 0;
  const n = Number(s.replace(",", "."));
  if (Number.isNaN(n) || !Number.isFinite(n)) return null;
  return Math.max(0, Math.round(n * 100));
}

function formatCents(cents: number, priceLocale: "fr" | "en") {
  const s = (cents / 100).toFixed(2);
  return priceLocale === "fr" ? s.replace(".", ",") : s;
}

function valueToString(value: InputProps["value"]): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  // readonly string[] -> join pour afficher quelque chose de stable
  return Array.isArray(value) ? value.join(",") : "";
}

export default function Input({
  label,
  value,
  onChange,
  onValueChange,
  type = "text",
  placeholder,
  className = "",
  inputClassName = "",
  required,
  format = "none",
  priceLocale = "fr",
  onBlur,
  onFocus,
  inputMode,
  ...rest
}: InputProps) {
  const isPrice = format === "price";

  const externalString = useMemo(() => valueToString(value), [value]);

  // draft local uniquement pendant l’édition (focus)
  const [isFocused, setIsFocused] = useState(false);
  const [draft, setDraft] = useState("");

  const renderedValue = isPrice ? (isFocused ? draft : externalString) : externalString;

  const effectiveType = isPrice ? "text" : type;
  const effectiveInputMode = isPrice ? "decimal" : inputMode;

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
        type={effectiveType}
        inputMode={effectiveInputMode}
        value={renderedValue}
        placeholder={placeholder}
        required={required}
        aria-required={required}
        onFocus={(e) => {
          if (isPrice) {
            setIsFocused(true);
            // on démarre l’édition avec la valeur affichée actuelle
            setDraft(externalString);
          }
          onFocus?.(e);
        }}
        onChange={(e) => {
          if (!isPrice) {
            onChange?.(e);
            onValueChange?.({ kind: "raw", raw: e.target.value });
            return;
          }

          const sanitized = sanitizePriceInput(e.target.value);
          setDraft(sanitized);

          // pas de setEditing ici -> cents null
          onValueChange?.({ kind: "priceDraft", raw: sanitized });

          // pour compat legacy
          onChange?.({
            ...e,
            target: { ...e.target, value: sanitized },
            currentTarget: { ...e.currentTarget, value: sanitized },
          } as any);
        }}
        onBlur={(e) => {
          if (!isPrice) {
            onBlur?.(e);
            return;
          }

          const raw = draft.trim();
          const cents = parsePriceToCents(raw);
            if (cents == null) {
              setIsFocused(false);
              onBlur?.(e);
              return;
            }

            onValueChange?.({ kind: "priceCommit", raw, cents });

          // format visuel
          const formatted = formatCents(cents, priceLocale);

          // on sort du focus => on affichera externalString ensuite
          setIsFocused(false);
          onBlur?.(e);

          // option: on aligne le draft sur le format (utile si re-focus direct)
          setDraft(formatted);

          onBlur?.(e);
        }}
        {...rest}
      />
    </label>
  );
}