import { supabase } from "../../../../gateways/supabase/supabaseClient";
import { EventRegistrationFormPanel } from "../../../../features/admin/events/singleEvent/EventRegistrationFormPanel";

type AnyRecord = Record<string, any>;

function toRows(value: any): AnyRecord[] {
  if (Array.isArray(value)) return value as AnyRecord[];
  if (value && Array.isArray(value.rows)) return value.rows as AnyRecord[];
  return [];
}

export function SingleEventFormSection(props: {
  event: any;
  data: AnyRecord;
  onChanged: () => Promise<void>;
}) {
  const { event, data, onChanged } = props;

  const fields = toRows(data.formFields);

  return (
    <div className="adminEventSection adminSingleEventForm">
      <EventRegistrationFormPanel
        supabase={supabase as any}
        event={event}
        fields={fields}
        onChanged={onChanged}
      />
    </div>
  );
}
