import type { EventFormFieldUI } from "../../../../domain/models/db/db.eventFormFields.schema";
import { AttendeeFieldInput } from "../../createOrder/AttendeeFieldInput";
import { getFieldKey } from "../../../../domain/helpers/fields";

type Props = {
  fields: EventFormFieldUI[];
  values: Record<string, unknown>;
  errors?: Record<string, string>;
  onChange: (fieldKey: string, value: unknown) => void;
};

export function AttendeeFieldsForm({
  fields,
  values,
  errors = {},
  onChange,
}: Props) {
  return (
    <div className="adminAttendeeFieldsGrid">
      {fields
        .filter((f) => (f.isActive ?? true) === true)
        .map((f) => {
          const k = getFieldKey(f);
          if (!k) return null;

          return (
            <div key={String(f.id ?? k)} className="adminAttendeeFieldItem">
              <AttendeeFieldInput
                field={f}
                value={values?.[k]}
                errorMsg={errors?.[k]}
                onChange={(val) => onChange(k, val)}
              />
            </div>
          );
        })}
    </div>
  );
}
