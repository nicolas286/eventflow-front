import type { EventFormFieldUI } from "../../../domain/models/db/db.eventFormFields.schema";
import { AttendeeFieldInput } from "./AttendeeFieldInput";
import type { AttendeeSlot } from "./AdminCreateOrderStep3";

type Props = {
  index: number;
  attendee: AttendeeSlot;
  productName: string;

  fields: EventFormFieldUI[];
  errors: Record<string, string>;

  setAnswer: (attIndex: number, fieldKey: string, value: unknown) => void;
};

export function AttendeeCard({
  index,
  attendee,
  productName,
  fields,
  errors,
  setAnswer,
}: Props) {
  return (
    <div
      style={{
        border: "1px solid rgba(0,0,0,0.10)",
        borderRadius: 12,
        padding: 12,
      }}
    >
      <div style={{ fontWeight: 900, marginBottom: 8 }}>
        Participant {index + 1}{" "}
        <span style={{ fontWeight: 700, opacity: 0.7 }}>· {productName}</span>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {fields.map((f) => (
          <AttendeeFieldInput
            key={String(f.id)}
            field={f}
            value={attendee.values?.[f.fieldKey]}
            errorMsg={errors[String(f.fieldKey ?? "")]}
            onChange={(val) => setAnswer(index, f.fieldKey, val)}
          />
        ))}
      </div>
    </div>
  );
}
