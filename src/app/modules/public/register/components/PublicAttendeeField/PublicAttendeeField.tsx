import type { CSSProperties } from "react";
import CountrySelect from "@shared/ui/components/inputs/CountrySelect";
import PhoneInput from "@shared/ui/components/inputs/PhoneInput";
import { MessageBox } from "@ui/components/message/MessageBox";
import type { PublicFormField as Field } from "@app/modules/public/events/schemas/public.eventDetailBySlug.schema";
import type { EventFormFieldUI } from "@shared/models/db/db.eventFormFields.schema";
import {
  isBirthDateField,
  isCountryField,
  isPhoneField,
} from "@helpers/fields";
import { toSelectOptions } from "@shared/helpers/fields";

type Props = {
  field: Field;
  value: unknown;
  error?: string;
  touched?: boolean;
  attemptedNext: boolean;
  onChange: (value: unknown, opts?: { touch?: boolean }) => void;
  onBlur: () => void;
};

const commonStyle: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(0,0,0,0.10)",
  outline: "none",
};

export function PublicAttendeeField({
  field,
  value,
  error,
  touched,
  attemptedNext,
  onChange,
  onBlur,
}: Props) {
  const showErr = !!error && (attemptedNext || !!touched);

  const label = (
    <div style={{ fontWeight: 800, marginBottom: 6 }}>
      {field.label} {field.isRequired ? <span style={{ opacity: 0.7 }}>(requis)</span> : null}
    </div>
  );

  const errorLine = showErr ? <MessageBox variant="error">{error}</MessageBox> : null;

  if (isBirthDateField(field as EventFormFieldUI)) {
    return (
      <div>
        {label}
        <input
          type="date"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          style={commonStyle}
        />
        {errorLine}
      </div>
    );
  }

  if (isCountryField(field as EventFormFieldUI)) {
    return (
      <div>
        {label}
        <CountrySelect
          value={typeof value === "string" ? value : ""}
          onChange={(v) => onChange(v, { touch: true })}
          style={commonStyle}
          placeholder="Sélectionner un pays"
        />
        {errorLine}
      </div>
    );
  }

  if (isPhoneField(field as EventFormFieldUI)) {
    return (
      <div>
        {label}
        <PhoneInput
          value={typeof value === "string" ? value : ""}
          onChange={(v) => onChange(v)}
          groupClassName="publicPhoneGroup"
          selectStyle={commonStyle}
          inputStyle={commonStyle}
          defaultDial="+32"
        />
        {errorLine}
      </div>
    );
  }

  if (field.fieldType === "textarea") {
    return (
      <div>
        {label}
        <textarea
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          style={{ ...commonStyle, minHeight: 90, resize: "vertical" }}
        />
        {errorLine}
      </div>
    );
  }

  if (field.fieldType === "select") {
    return (
      <div>
        {label}
        <select
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value, { touch: true })}
          onBlur={onBlur}
          style={commonStyle}
        >
          <option value="">—</option>
          {toSelectOptions(field.options).map((o, i) => (
          <option key={i} value={o.value}>
            {o.label}
          </option>
        ))}
        </select>
        {errorLine}
      </div>
    );
  }

  if (field.fieldType === "checkbox") {
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input
            type="checkbox"
            checked={value === true}
            onChange={(e) => onChange(e.target.checked, { touch: true })}
            style={{ width: 18, height: 18 }}
          />
          <div style={{ fontWeight: 800 }}>
            {field.label} {field.isRequired ? <span style={{ opacity: 0.7 }}>(requis)</span> : null}
          </div>
        </div>
        {errorLine}
      </div>
    );
  }

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
        onChange={(e) =>
          onChange(
            inputType === "number"
              ? e.target.value === ""
                ? ""
                : Number(e.target.value)
              : e.target.value
          )
        }
        onBlur={onBlur}
        style={commonStyle}
      />
      {errorLine}
    </div>
  );
}