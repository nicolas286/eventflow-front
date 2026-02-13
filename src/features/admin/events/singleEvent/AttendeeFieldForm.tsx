import type { EventFormFieldUI } from "../../../../domain/models/db/db.eventFormFields.schema";
import { AttendeeFieldInput } from "../../createOrder/AttendeeFieldInput";

type Props = {
  fields: EventFormFieldUI[];
  values: Record<string, unknown>;
  errors?: Record<string, string>;
  onChange: (fieldKey: string, value: unknown) => void;
};

export function AttendeeFieldsForm({ fields, values, errors = {}, onChange }: Props) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {fields.map((f) => {
        const k = String(f.fieldKey ?? "");
        return (
          <AttendeeFieldInput
            key={String(f.id ?? k)}
            field={f}
            value={values?.[k]}
            errorMsg={errors?.[k]}
            onChange={(val) => onChange(k, val)}
          />
        );
      })}
    </div>
  );
}
