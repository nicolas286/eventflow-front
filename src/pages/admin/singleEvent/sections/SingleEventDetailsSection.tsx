import type { UpdateEventFullPatch } from "../../../../domain/models/admin/admin.updateEventFullPatch.schema";
import { EventDetailsForm } from "../../../../features/admin/events/singleEvent/EventDetailsForm";

export function SingleEventDetailsSection(props: {
  event: any;
  updateError?: string | null;
  onConfirm: (patch: UpdateEventFullPatch) => Promise<void>;
  onUploadBanner: (file: File) => Promise<any>;
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
