import { supabase } from "@gateways/supabase/supabaseClient";
import { EventRegistrationFormPanel } from "../../singleEvent/components/EventRegistrationFormPanel";

import type { AdminEventDetailEvent } from "../../singleEvent/schemas/admin.eventDetail.schema";
import type { EventFormField, EventFormFieldGroup } from "@shared/models/db/db.eventFormFields.schema";

export function SingleEventFormSection(props: {
  event: AdminEventDetailEvent;
  fields: EventFormField[];
  fieldsGroups: EventFormFieldGroup[];
  onChanged: () => Promise<void>;
}) {
  const { event, fields, fieldsGroups, onChanged } = props;

  return (
    <EventRegistrationFormPanel
      supabase={supabase}
      event={event}
      fields={fields}
      fieldsGroups={fieldsGroups}
      onChanged={onChanged}
    />
  );
}