
import { toDayEndISO, toDayStartISO, parseTs } from "@helpers/dateTime";
import type { PublicEventOverview } from "../schemas/public.orgEventsOverview.schema";

export type SortKey = "date" | "name";
export type SortDir = "asc" | "desc";

export type OrgEventsFilters = {
  query: string;
  dateFrom: string;
  dateTo: string;
  sortKey: SortKey;
  sortDir: SortDir;
  nowTs: number;
};

export function getEventPastCutoffTs(e: PublicEventOverview) {
  return parseTs(e.endsAt) ?? parseTs(e.startsAt);
}

export function filterAndSortOrgEvents(
  events: PublicEventOverview[],
  filters: OrgEventsFilters
) {
  const { query, dateFrom, dateTo, sortKey, sortDir, nowTs } = filters;

  const q = query.trim().toLowerCase();
  const fromTs = dateFrom ? Date.parse(toDayStartISO(dateFrom)) : null;
  const toTs = dateTo ? Date.parse(toDayEndISO(dateTo)) : null;

  const baseFrom = fromTs ?? nowTs;

  const filtered = events.filter((e) => {
    if (q) {
      const hay = `${e.title ?? ""} ${e.location ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }

    const cutoffTs = getEventPastCutoffTs(e);
    if (cutoffTs !== null && cutoffTs < baseFrom) return false;

    const startTs = parseTs(e.startsAt);
    if (toTs !== null && startTs !== null && startTs > toTs) return false;

    return true;
  });

  const dir = sortDir === "asc" ? 1 : -1;

  filtered.sort((a, b) => {
    if (sortKey === "name") {
      const A = (a.title ?? "").toLocaleLowerCase();
      const B = (b.title ?? "").toLocaleLowerCase();
      return A.localeCompare(B) * dir;
    }

    const aTs = parseTs(a.startsAt) ?? Number.POSITIVE_INFINITY;
    const bTs = parseTs(b.startsAt) ?? Number.POSITIVE_INFINITY;
    return (aTs - bTs) * dir;
  });

  return filtered;
}

export function hasActiveOrgEventFilters(params: {
  query: string;
  dateFrom: string;
  dateTo: string;
}) {
  return !!params.query.trim() || !!params.dateFrom || !!params.dateTo;
}