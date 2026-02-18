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

  const fieldLabelText = String(field.label ?? field.fieldKey ?? "");
  const isReq = Boolean(field.isRequired);

  const Label = () => (
    <div className="adminFormLabel adminCO_FieldLabel">
      {fieldLabelText} {isReq ? <span className="adminFormReq adminCO_FieldReq">(requis)</span> : null}
    </div>
  );

  const Error = () => (errorMsg ? <MessageBox variant="error">{errorMsg}</MessageBox> : null);

  // date
  if (isBirthDateField(field) || field.fieldType === "date") {
    return (
      <div className="adminFormField adminCO_Field">
        <Label />
        <input
          className="adminFormControl adminCO_Control"
          type="date"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
        <Error />
      </div>
    );
  }

  // country
  if (isCountryField(field)) {
    return (
      <div className="adminFormField adminCO_Field">
        <Label />
        <input
          className="adminFormControl adminCO_Control"
          type="text"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Pays"
        />
        <Error />
      </div>
    );
  }

  // phone
  if (isPhoneField(field)) {
    return (
      <div className="adminFormField adminCO_Field">
        <Label />
        <input
          className="adminFormControl adminCO_Control"
          type="tel"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Téléphone"
        />
        <Error />
      </div>
    );
  }

  // textarea
  if (field.fieldType === "textarea") {
    return (
      <div className="adminFormField adminCO_Field">
        <Label />
        <textarea
          className="adminFormControl adminFormTextarea adminCO_Control adminCO_Textarea"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
        <Error />
      </div>
    );
  }

  // select
  if (field.fieldType === "select") {
    return (
      <div className="adminFormField adminCO_Field">
        <Label />
        <select
          className="adminFormControl adminCO_Control"
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
        <Error />
      </div>
    );
  }

  // checkbox
  if (field.fieldType === "checkbox") {
    return (
      <div className="adminFormField adminCO_Field">
        <label className="adminFormCheckRow adminCO_CheckRow">
          <input
            className="adminFormCheckbox adminCO_Checkbox"
            type="checkbox"
            checked={value === true}
            onChange={(e) => onChange(e.target.checked)}
          />
          <div className="adminFormCheckText adminCO_CheckText">
            {fieldLabelText} {isReq ? <span className="adminFormReq adminCO_FieldReq">(requis)</span> : null}
          </div>
        </label>
        <Error />
      </div>
    );
  }

  // default input
  const inputType: "text" | "email" | "number" =
    field.fieldType === "email" ? "email" : field.fieldType === "number" ? "number" : "text";

  const inputValue =
    inputType === "number"
      ? typeof value === "number"
        ? String(value)
        : typeof value === "string"
          ? value
          : ""
      : typeof value === "string"
        ? value
        : "";

  return (
    <div className="adminFormField adminCO_Field">
      <Label />
      <input
        className="adminFormControl adminCO_Control"
        type={inputType}
        value={inputValue}
        onChange={(e) => {
          if (inputType === "number") {
            const raw = e.target.value;
            onChange(raw === "" ? null : Number(raw));
          } else {
            onChange(e.target.value);
          }
        }}
      />
      <Error />
    </div>
  );
}
