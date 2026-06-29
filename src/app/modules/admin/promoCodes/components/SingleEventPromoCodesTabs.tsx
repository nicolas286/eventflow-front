import { supabase } from "@gateways/supabase/supabaseClient";
import { EventPromoCodesPanel } from "./EventPromoCodesPanel";

import type { AdminEventDetailEvent } from "../../singleEvent/schemas/admin.eventDetail.schema";

export function SingleEventPromoCodesSection(props: {
  orgId: string | null;
  event: AdminEventDetailEvent;
  onChanged: () => Promise<void>;
}) {
  const { orgId, event, onChanged } = props;

  return (
    <EventPromoCodesPanel
      supabase={supabase}
      orgId={orgId}
      event={event}
      onChanged={onChanged}
    />
  );
}