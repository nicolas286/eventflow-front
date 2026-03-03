import { useMemo, useRef, useState } from "react";
import type { EventOverviewRow } from "@app/modules/admin/events/schemas/admin.eventsOverview.schema";

export function useEventEditorPanel(events: EventOverviewRow[]) {
  const [editorEventId, setEditorEventId] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  const pendingOpenIdRef = useRef<string | null>(null);

  const selectedRow: EventOverviewRow | null = useMemo(() => {
    if (!editorEventId) return null;
    return events.find((e) => e.event.id === editorEventId) ?? null;
  }, [events, editorEventId]);

  const editingId = editorEventId ?? undefined;

  const open = (id: string) => {
    if (isClosing) {
      pendingOpenIdRef.current = id;
      return;
    }
    setEditorEventId(id);
    setIsClosing(false);
  };

  const close = () => {
    if (!editorEventId) return;
    setIsClosing(true);
  };

  const select = (id: string) => {
    if (editorEventId === id && !isClosing) {
      close();
      return;
    }
    open(id);
  };

  const closeIf = (id: string) => {
    if (editorEventId === id) close();
  };

  const onAnimEnd = () => {
    if (!isClosing) return;

    setIsClosing(false);

    const pending = pendingOpenIdRef.current;
    pendingOpenIdRef.current = null;

    if (pending) {
      setEditorEventId(pending);
      return;
    }

    setEditorEventId(null);
  };

  const panelClassName =
    editorEventId === null ? "isClosed" : isClosing ? "isClosing" : "isOpen";

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
