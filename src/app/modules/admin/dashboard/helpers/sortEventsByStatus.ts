import type { EventOverviewRow } from "../../events/schemas/admin.eventsOverview.schema";

export function splitEventsByStatus(
  events: EventOverviewRow[],
  nowMs: number = Date.now()
) {
  const upcoming: EventOverviewRow[] = [];
  const past: EventOverviewRow[] = [];

  for (const row of events) {
    const referenceDate =
      row.event.endsAt ?? row.event.startsAt;

    if (!referenceDate) {
      upcoming.push(row);
      continue;
    }

    const timestamp = Date.parse(referenceDate);

    if (!Number.isFinite(timestamp) || timestamp >= nowMs) {
      upcoming.push(row);
      continue;
    }

    past.push(row);
  }

  return {
    upcoming,
    past,
  };
}