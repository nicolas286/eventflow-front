import type { UpdateEventFullPatch } from "../../../../domain/models/admin/admin.updateEventFullPatch.schema";
import { EventDetailsForm } from "../../../../features/admin/events/singleEvent/EventDetailsForm";
import type { AdminEventDetailEvent } from "../../../../domain/models/admin/admin.eventDetail.schema";
import type { UploadResult } from "../../../../gateways/supabase/repositories/dashboard/uploadOrgAssets.repo";

export function SingleEventDetailsSection(props: {
  event: AdminEventDetailEvent;
  updateError?: string | null;
  onConfirm: (patch: UpdateEventFullPatch) => Promise<void>;
  onUploadBanner: (file: File) => Promise<UploadResult>;
}) {
  const { event, updateError, onConfirm, onUploadBanner } = props;

  return (
    <div className="adminEventSection adminSingleEventDetails">
      <EventDetailsForm
        key={event.updatedAt ?? event.id}
        event={event}
        onConfirm={onConfirm}
        onUploadBanner={onUploadBanner}
      />
      {updateError && <p style={{ color: "crimson" }}>{updateError}</p>}
    </div>
  );
}
