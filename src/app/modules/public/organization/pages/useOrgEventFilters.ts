import { useMemo, useState } from "react";
import { filterAndSortOrgEvents, hasActiveOrgEventFilters, type SortDir, type SortKey } from "./orgPublicPage.logic";
import type { PublicEventOverview } from "../schemas/public.orgEventsOverview.schema";

export function useOrgEventFilters(events: PublicEventOverview[], nowTs: number) {
  const [query, setQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filteredSortedEvents = useMemo(() => {
    return filterAndSortOrgEvents(events, {
      query,
      dateFrom,
      dateTo,
      sortKey,
      sortDir,
      nowTs,
    });
  }, [events, query, dateFrom, dateTo, sortKey, sortDir, nowTs]);

  const hasActiveFilters = hasActiveOrgEventFilters({ query, dateFrom, dateTo });

  const resetFilters = () => {
    setQuery("");
    setDateFrom("");
    setDateTo("");
    setSortKey("date");
    setSortDir("asc");
  };

  return {
    query,
    setQuery,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    sortKey,
    setSortKey,
    sortDir,
    setSortDir,
    filtersOpen,
    setFiltersOpen,
    filteredSortedEvents,
    hasActiveFilters,
    resetFilters,
  };
}