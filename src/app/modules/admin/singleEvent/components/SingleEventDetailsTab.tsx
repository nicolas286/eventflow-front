import type { UpdateEventFullPatch } from "../schemas/admin.updateEventFullPatch.schema";
import type { AdminEventDetailEvent } from "../schemas/admin.eventDetail.schema";
import type { UploadResult } from "@gateways/supabase/repositories/dashboard/uploadOrgAssets.repo";

import { EventDetailsPanel } from "./EventDetailsPanel/EventDetailsForm";

export function SingleEventDetailsSection(props: {
  event: AdminEventDetailEvent;
  updateError?: string | null;
  onConfirm: (patch: UpdateEventFullPatch) => Promise<void>;
  onUploadBanner: (file: File) => Promise<UploadResult>;
}) {
  const { event, updateError, onConfirm, onUploadBanner } = props;

  return (
    <EventDetailsPanel
      key={event.updatedAt ?? event.id}
      event={event}
      updateError={updateError}
      onConfirm={onConfirm}
      onUploadBanner={onUploadBanner}
    />
  );
}