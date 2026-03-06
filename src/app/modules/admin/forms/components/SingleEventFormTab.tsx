import { supabase } from "@gateways/supabase/supabaseClient";
import { EventRegistrationFormPanel } from "../../singleEvent/components/EventRegistrationFormPanel";

import type { AdminEventDetailEvent } from "../../singleEvent/schemas/admin.eventDetail.schema";
import type { EventFormField } from "@shared/models/db/db.eventFormFields.schema";

export function SingleEventFormSection(props: {
  event: AdminEventDetailEvent;
  fields: EventFormField[];
  onChanged: () => Promise<void>;
}) {
  const { event, fields, onChanged } = props;

  return (
    <EventRegistrationFormPanel
      supabase={supabase}
      event={event}
      fields={fields}
      onChanged={onChanged}
    />
  );
}