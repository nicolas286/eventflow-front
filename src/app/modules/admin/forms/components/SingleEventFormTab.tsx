import { supabase } from "@gateways/supabase/supabaseClient";
import { EventRegistrationFormPanel } from "../../singleEvent/components/EventRegistrationFormPanel";
import type { AdminEventDetailEvent, EventDetailAdmin } from "../../singleEvent/schemas/admin.eventDetail.schema";

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