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
  const selectOptions = useMemo(() => toSelectOptions(field.options), [field.options]);

  const label = (
    <div className="adminCO_FieldLabel">
      {String(field.label ?? field.fieldKey)}{" "}
      {field.isRequired ? <span className="adminCO_FieldReq">(requis)</span> : null}
    </div>
  );

  // date
  if (isBirthDateField(field) || field.fieldType === "date") {
    return (
      <div className="adminCO_Field">
        {label}
        <input
          className="adminCO_Control"
          type="date"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
        {errorMsg ? <MessageBox variant="error">{errorMsg}</MessageBox> : null}
      </div>
    );
  }

  // country
  if (isCountryField(field)) {
    return (
      <div className="adminCO_Field">
        {label}
        <input
          className="adminCO_Control"
          type="text"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Pays"
        />
        {errorMsg ? <MessageBox variant="error">{errorMsg}</MessageBox> : null}
      </div>
    );
  }

  // phone
  if (isPhoneField(field)) {
    return (
      <div className="adminCO_Field">
        {label}
        <input
          className="adminCO_Control"
          type="tel"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Téléphone"
        />
        {errorMsg ? <MessageBox variant="error">{errorMsg}</MessageBox> : null}
      </div>
    );
  }

  // textarea
  if (field.fieldType === "textarea") {
    return (
      <div className="adminCO_Field">
        {label}
        <textarea
          className="adminCO_Control adminCO_Textarea"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
        {errorMsg ? <MessageBox variant="error">{errorMsg}</MessageBox> : null}
      </div>
    );
  }

  // select
  if (field.fieldType === "select") {
    return (
      <div className="adminCO_Field">
        {label}
        <select
          className="adminCO_Control"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
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
      <div className="adminCO_Field">
        <label className="adminCO_CheckRow">
          <input
            className="adminCO_Checkbox"
            type="checkbox"
            checked={value === true}
            onChange={(e) => onChange(e.target.checked)}
          />
          <div className="adminCO_CheckText">
            {String(field.label ?? field.fieldKey)}{" "}
            {field.isRequired ? <span className="adminCO_FieldReq">(requis)</span> : null}
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
    <div className="adminCO_Field">
      {label}
      <input
        className="adminCO_Control"
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
      />
      {errorMsg ? <MessageBox variant="error">{errorMsg}</MessageBox> : null}
    </div>
  );
}
