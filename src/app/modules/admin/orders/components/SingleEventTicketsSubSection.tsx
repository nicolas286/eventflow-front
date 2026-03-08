import { useMemo, useState } from "react";

import { supabase } from "@gateways/supabase/supabaseClient";

import { Button, FilterBar } from "@ui/components";
import { useAdminSingleEventTicketsData } from "../../singleEvent/hooks/useEventTickets";

import type { AdminEventTicketRow as AdminEventTicket } from "../../singleEvent/schemas/admin.eventTickets.schema";
import { useMarkTicketCheckedIn } from "../hooks/useMarkTicketCheckedIn";

import "./attendees.css";
import { MessageBox } from "@shared/ui/components/message/MessageBox";

type FilterMode = "all" | "used" | "unused";

const PAGE_SIZE = 25;

function norm(v: unknown) {
  return String(v ?? "").trim().toLowerCase();
}

export function SingleEventTicketsSubSection(props: {
  eventId: string;
  eventTitle: string;
  onChanged?: () => Promise<void>;
}) {
  const { eventId } = props;

  const [query, setQuery] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [pageByEvent, setPageByEvent] = useState<Record<string, number>>({});

  const page = pageByEvent[eventId] ?? 0;
  const offset = page * PAGE_SIZE;

  const { data, loading, error, refetch } = useAdminSingleEventTicketsData({
    supabase,
    eventId,
    enabled: Boolean(eventId),
    limit: PAGE_SIZE,
    offset,
  });

  const tickets = useMemo(() => data?.tickets?.rows ?? [], [data]);
  const markTicket = useMarkTicketCheckedIn({ supabase });

  const filtered = useMemo(() => {
  let rows = tickets;

  if (filterMode === "used") {
    rows = rows.filter((t) => Boolean(t.checkedInAt));
  }

  if (filterMode === "unused") {
    rows = rows.filter((t) => !t.checkedInAt);
  }

  const q = norm(query);

  if (q) {
    rows = rows.filter((t) => {
      const attendeeText = (t.attendeeSummaryLines ?? []).join(" • ");

      return (
        norm(t.reference).includes(q) ||
        norm(t.productNameSnapshot).includes(q) ||
        norm(t.qrToken).includes(q) ||
        norm(t.buyerEmail).includes(q) ||
        norm(attendeeText).includes(q)
      );
    });
  }

  return [...rows].sort((a, b) => {
    const aUsed = Boolean(a.checkedInAt);
    const bUsed = Boolean(b.checkedInAt);

    if (aUsed !== bUsed) {
      return aUsed ? 1 : -1; // utilisés à la fin
    }

    return 0;
  });
}, [tickets, filterMode, query]);

  const canGoPrev = page > 0;
  const canGoNext = tickets.length === PAGE_SIZE && !query.trim() && filterMode === "all";

  return (
    <div className="adminTicketsSection">
      <div className="adminParticipantsHeader">
        <div>
          <h3 className="adminParticipantsTitle">Tickets</h3>
          <div className="adminParticipantsHint">
            {query.trim() || filterMode !== "all"
              ? `${filtered.length} billet(s) sur cette page`
              : `${tickets.length} billet(s) affiché(s)`}
          </div>
        </div>

        <div className="adminParticipantsHeaderRight">
          <Button variant="secondary" onClick={() => void refetch()}>
            Rafraîchir
          </Button>
        </div>
      </div>

      <FilterBar
        query={query}
        onQueryChange={setQuery}
        selectValue={filterMode}
        onSelectChange={(v) => setFilterMode(v as FilterMode)}
        placeholder="Rechercher un billet…"
        selectOptions={[
          { value: "all", label: "Tous" },
          { value: "unused", label: "Non utilisés" },
          { value: "used", label: "Utilisés" },
        ]}
      />

      {markTicket.error ? (
  <MessageBox variant="error">{markTicket.error}</MessageBox>
) : null}

      {!query.trim() && filterMode === "all" ? (
        <div className="adminListPager">
          <Button
            variant="secondary"
            disabled={!canGoPrev || loading}
            onClick={() =>
              setPageByEvent((prev) => ({
                ...prev,
                [eventId]: Math.max(0, (prev[eventId] ?? 0) - 1),
              }))
            }
          >
            Précédent
          </Button>

          <div className="adminListPager__label">
            Page {page + 1}
            {tickets.length > 0 ? ` — ${tickets.length} ticket(s)` : ""}
          </div>

          <Button
            variant="secondary"
            disabled={!canGoNext || loading}
            onClick={() =>
              setPageByEvent((prev) => ({
                ...prev,
                [eventId]: (prev[eventId] ?? 0) + 1,
              }))
            }
          >
            Suivant
          </Button>
        </div>
      ) : null}

      {loading ? (
        <div className="adminEventEmpty">Chargement des billets…</div>
      ) : error ? (
        <div className="adminEventEmpty">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="adminEventEmpty">
          {query.trim() || filterMode !== "all"
            ? "Aucun résultat avec ces filtres."
            : "Aucun billet pour le moment."}
        </div>
      ) : (
        <div className="adminTicketsList">
          {filtered.map((ticket: AdminEventTicket) => {
            const isUsed = Boolean(ticket.checkedInAt);
            const isInvalid = ticket.status === "invalid";

            return (
              <div key={ticket.id} className="adminTicketRow">
                <div className="adminTicketRowMain">
                  <div className="adminTicketRowTitle">
                    {ticket.productNameSnapshot}
                  </div>

                  <div className="adminTicketRowMeta">
                    #{ticket.ticketIndex} • réf {ticket.reference}
                    {ticket.createsAttendees ? " • nominatif" : " • non nominatif"}
                  </div>

                  {ticket.attendeeSummaryLines?.length > 0 ? (
                    <div className="adminTicketRowAttendee">
                      {ticket.attendeeSummaryLines.join(" • ")}
                    </div>
                  ) : null}

                  {ticket.buyerEmail ? (
                    <div className="adminTicketRowBuyer">
                      Acheteur : {ticket.buyerEmail}
                    </div>
                  ) : null}
                </div>

                <div className="adminTicketRowRight">
                  <div className="adminTicketRowActions">
                    {isInvalid ? (
                      <span className="adminTicketStatus invalid">Invalide</span>
                    ) : isUsed ? (
                      <span className="adminTicketStatus used">Utilisé</span>
                    ) : (
                      <span className="adminTicketStatus ready">Non utilisé</span>
                    )}

                    <Button
                        variant="secondary"
                        disabled={isUsed || isInvalid || markTicket.loading}
                        onClick={async () => {
                            const res = await markTicket.markTicketCheckedIn(ticket.id);
                            if (!res) return;
                            await refetch();
                        }}
                        >
                        Marquer comme utilisé
                        </Button>
                    
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}