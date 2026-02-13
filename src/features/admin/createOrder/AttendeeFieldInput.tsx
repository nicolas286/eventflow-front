import type { EventFormFieldUI } from "../../../domain/models/db/db.eventFormFields.schema";
import { MessageBox } from "../../../ui/components/message/MessageBox";
import { isBirthDateField, isCountryField, isPhoneField } from "../../../domain/helpers/fields";
import { useMemo } from "react";
import { toSelectOptions } from "../../../domain/helpers/fields";

type Props = {
  field: EventFormFieldUI;
  value: unknown;
  errorMsg?: string;
  onChange: (value: unknown) => void;
};

export function AttendeeFieldInput({ field, value, errorMsg, onChange }: Props) {
  const commonStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    outline: "none",
  };

  const label = (
    <div style={{ fontWeight: 900, marginBottom: 6 }}>
      {String(field.label ?? field.fieldKey)}{" "}
      {field.isRequired ? <span style={{ opacity: 0.7 }}>(requis)</span> : null}
    </div>
  );

  const selectOptions = useMemo(() => toSelectOptions(field.options), [field.options]);

  // date
  if (isBirthDateField(field) || field.fieldType === "date") {
    return (
      <div>
        {label}
        <input
          type="date"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          style={commonStyle}
        />
        {errorMsg ? <MessageBox variant="error">{errorMsg}</MessageBox> : null}
      </div>
    );
  }

  // country
  if (isCountryField(field)) {
    return (
      <div>
        {label}
        <input
          type="text"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          style={commonStyle}
          placeholder="Pays"
        />
        {errorMsg ? <MessageBox variant="error">{errorMsg}</MessageBox> : null}
      </div>
    );
  }

  // phone
  if (isPhoneField(field)) {
    return (
      <div>
        {label}
        <input
          type="tel"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          style={commonStyle}
          placeholder="Téléphone"
        />
        {errorMsg ? <MessageBox variant="error">{errorMsg}</MessageBox> : null}
      </div>
    );
  }

  // textarea
  if (field.fieldType === "textarea") {
    return (
      <div>
        {label}
        <textarea
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          style={{ ...commonStyle, minHeight: 90, resize: "vertical" }}
        />
        {errorMsg ? <MessageBox variant="error">{errorMsg}</MessageBox> : null}
      </div>
    );
  }

  // select
  if (field.fieldType === "select") {
    return (
      <div>
        {label}
        <select
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          style={commonStyle}
        >
          <option value="">—</option>
          {selectOptions.map((o, i) => (
            <option key={o.value ?? i} value={o.value}>
              {o.label}
            </option>
          ))}

        </select>
        {errorMsg ? <MessageBox variant="error">{errorMsg}</MessageBox> : null}
      </div>
    );
  }

  // checkbox
  if (field.fieldType === "checkbox") {
    return (
      <div>
        <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input
            type="checkbox"
            checked={value === true}
            onChange={(e) => onChange(e.target.checked)}
            style={{ width: 18, height: 18 }}
          />
          <div style={{ fontWeight: 900 }}>
            {String(field.label ?? field.fieldKey)}{" "}
            {field.isRequired ? <span style={{ opacity: 0.7 }}>(requis)</span> : null}
          </div>
        </label>
        {errorMsg ? <MessageBox variant="error">{errorMsg}</MessageBox> : null}
      </div>
    );
  }

  // default input
  const inputType =
    field.fieldType === "email"
      ? "email"
      : field.fieldType === "number"
        ? "number"
        : "text";

  return (
    <div>
      {label}
      <input
        type={inputType}
        value={
          inputType === "number"
            ? typeof value === "number"
              ? value
              : ""
            : typeof value === "string"
              ? value
              : ""
        }
        onChange={(e) => {
          if (inputType === "number") {
            onChange(e.target.value === "" ? null : Number(e.target.value));
          } else {
            onChange(e.target.value);
          }
        }}
        style={commonStyle}
      />
      {errorMsg ? <MessageBox variant="error">{errorMsg}</MessageBox> : null}
    </div>
  );
}
