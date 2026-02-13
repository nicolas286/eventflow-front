import type { EventFormFieldUI } from "../../../domain/models/db/db.eventFormFields.schema";
import type { AttendeeSlot } from "./AdminCreateOrderStep3";
import { AttendeeFieldsForm } from "../events/singleEvent/AttendeeFieldForm";

type Props = {
  index: number;
  attendee: AttendeeSlot;
  productName: string;
  fields: EventFormFieldUI[];
  errors: Record<string, string>;
  setAnswer: (attIndex: number, fieldKey: string, value: unknown) => void;
};

export function AttendeeCard({ index, attendee, productName, fields, errors, setAnswer }: Props) {
  return (
    <div style={{ border: "1px solid rgba(0,0,0,0.10)", borderRadius: 12, padding: 12 }}>
      <div style={{ fontWeight: 900, marginBottom: 8 }}>
        Participant {index + 1} <span style={{ fontWeight: 700, opacity: 0.7 }}>· {productName}</span>
      </div>

      <AttendeeFieldsForm
        fields={fields}
        values={attendee.values ?? {}}
        errors={errors}
        onChange={(fieldKey, val) => setAnswer(index, fieldKey, val)}
      />
    </div>
  );
}
