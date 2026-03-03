import type { EventFormFieldUI } from "@shared/models/db/db.eventFormFields.schema";
import type { AttendeeSlot } from "./AdminCreateOrderStep3";
import { AttendeeFieldsForm } from "../../singleEvent/components/AttendeeFieldForm";

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
    <div className="adminCO_AttendeeCard">
      <div className="adminCO_AttendeeHeader">
        <div className="adminCO_AttendeeTitle">
          Participant {index + 1}
          <span className="adminCO_AttendeeSub">· {productName}</span>
        </div>
      </div>

      <div className="adminCO_AttendeeForm">
        <AttendeeFieldsForm
          fields={fields}
          values={attendee.values ?? {}}
          errors={errors}
          onChange={(fieldKey, val) => setAnswer(index, fieldKey, val)}
        />
      </div>
    </div>
  );
}
