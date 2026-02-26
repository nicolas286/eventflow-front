import { supabase } from "../../../../gateways/supabase/supabaseClient";
import { EventRegistrationFormPanel } from "../../../../features/admin/events/singleEvent/EventRegistrationFormPanel";
import type {
  AdminEventDetailEvent,
  EventDetailAdmin,
} from "../../../../domain/models/admin/admin.eventDetail.schema";

export function SingleEventFormSection(props: {
  event: AdminEventDetailEvent;
  data: EventDetailAdmin;
  onChanged: () => Promise<void>;
}) {
  const { event, data, onChanged } = props;

  return (
    <EventRegistrationFormPanel
      supabase={supabase}
      event={event}
      fields={data.formFields}
      onChanged={onChanged}
    />
  );
}