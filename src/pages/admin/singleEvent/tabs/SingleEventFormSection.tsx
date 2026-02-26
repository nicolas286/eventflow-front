import { supabase } from "../../../../gateways/supabase/supabaseClient";
import { EventRegistrationFormPanel } from "../../../../features/admin/events/singleEvent/EventRegistrationFormPanel";
import type { AdminEventDetailEvent, EventDetailAdmin } from "../../../../domain/models/admin/admin.eventDetail.schema";

export function SingleEventFormSection(props: {
  event: AdminEventDetailEvent;
  data: EventDetailAdmin;
  onChanged: () => Promise<void>;
}) {
  const { event, data, onChanged } = props;

  const fields = data.formFields;

  return (
    <div className="adminEventSection adminSingleEventForm">
      <EventRegistrationFormPanel
        supabase={supabase}
        event={event}
        fields={fields}
        onChanged={onChanged}
      />
    </div>
  );
}
