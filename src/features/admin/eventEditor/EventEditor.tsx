import "../../../styles/eventEditor.css";

import { Badge, Card, CardBody, CardHeader } from "../../../ui/components";
import { getStatusInfo } from "../../../domain/helpers/status";
import type { EventOverviewRow } from "../../../domain/models/admin/admin.eventsOverview.schema";
import EventEditorForm from "./EventEditorForm";

type EditableEventFields = Partial<
  Pick<EventOverviewRow["event"], "title" | "isPublished" | "startsAt" | "endsAt">
> & { location?: string | null };

type Props = {
  event: EventOverviewRow | null;
  onUpdateEvent: (patch: EditableEventFields) => void;
};

export default function EventEditor({ event, onUpdateEvent }: Props) {
  if (!event) {
    return (
      <Card>
        <CardHeader title="Éditeur d’événement" subtitle="Sélectionne un événement" />
        <CardBody>
          <div className="eventEditor__empty">Aucun événement sélectionné.</div>
        </CardBody>
      </Card>
    );
  }

  const ev = event.event as any;
  const status = getStatusInfo(ev.isPublished ? "open" : "draft");

  return (
    <Card>
      <CardHeader title="Éditeur d’événement" right={<Badge tone={status.tone} label={status.label} />} />
      <CardBody>
        <EventEditorForm event={ev} onConfirm={onUpdateEvent} />
      </CardBody>
    </Card>
  );
}
