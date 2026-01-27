import { useEffect, useMemo, useState } from "react";
import type { EventOverviewRow } from "../../../domain/models/admin/admin.eventsOverview.schema";

export function useEventEditorPanel(events: EventOverviewRow[]) {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [editorEventId, setEditorEventId] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (selectedEventId) {
      setEditorEventId(selectedEventId);
      setIsClosing(false);
    }
  }, [selectedEventId]);

  const selectedRow: EventOverviewRow | null = useMemo(() => {
    if (!editorEventId) return null;
    return events.find((e) => e.event.id === editorEventId) ?? null;
  }, [events, editorEventId]);

  const editingId = editorEventId ?? undefined;

  const select = (id: string) => {
    if (editorEventId === id) {
      setIsClosing(true);
      setSelectedEventId(null);
      return;
    }
    setSelectedEventId(id);
  };

  const close = () => {
    if (!editorEventId) return;
    setIsClosing(true);
    setSelectedEventId(null);
  };

  const closeIf = (id: string) => {
    if (editorEventId === id) close();
  };

  const onAnimEnd = () => {
    if (!isClosing) return;
    setIsClosing(false);
    setEditorEventId(null);
  };

  const panelClassName = isClosing ? "isClosing" : "isOpen";

  return {
    selectedRow,
    editingId,
    select,
    close,
    closeIf,
    onAnimEnd,
    panelClassName,
  };
}
