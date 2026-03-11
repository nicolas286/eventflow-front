import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { supabase } from "@gateways/supabase/supabaseClient";

import { Button, FilterBar } from "@ui/components";
import { useAdminSingleEventTicketsData } from "../../singleEvent/hooks/useEventTickets";

import type { AdminEventTicketRow as AdminEventTicket } from "../../singleEvent/schemas/admin.eventTickets.schema";
import { useMarkTicketCheckedIn } from "../hooks/useMarkTicketCheckedIn";
import { useMarkTicketCheckedInByQr } from "../hooks/useMarkTicketCheckedInByQr";
import {
  TicketQrScannerFullscreen,
  type TicketQrScanOutcome,
} from "../components/TicketQrScannerFullscreen";

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
  const [page, setPage] = useState(0);
  const [scannerOpen, setScannerOpen] = useState(false);

  const offset = page * PAGE_SIZE;

  const { data, loading, error, refetch } = useAdminSingleEventTicketsData({
    supabase,
    eventId,
    enabled: Boolean(eventId),
    limit: PAGE_SIZE,
    offset,
  });

  const rawTickets = useMemo(() => data?.tickets?.rows ?? [], [data]);
  const totalTickets = data?.tickets?.total ?? 0;

  const markTicket = useMarkTicketCheckedIn({ supabase });
  const markTicketByQr = useMarkTicketCheckedInByQr({ supabase });

  const ticketsByQrToken = useMemo(() => {
    const map = new Map<string, AdminEventTicket>();

    for (const ticket of rawTickets) {
      map.set(ticket.qrToken.trim(), ticket);
    }

    return map;
  }, [rawTickets]);

  const ticketsByQrTokenRef = useRef(ticketsByQrToken);

  useEffect(() => {
    ticketsByQrTokenRef.current = ticketsByQrToken;
  }, [ticketsByQrToken]);

  const handleScanToken = useCallback(
    async (qrTokenRaw: string): Promise<TicketQrScanOutcome> => {
      const qrToken = qrTokenRaw.trim();

      try {
        const result = await markTicketByQr.markTicketCheckedInByQr(qrToken, eventId);
        const localTicket = ticketsByQrTokenRef.current.get(qrToken);

        const ticket = {
          ticketId: result.ticketId,
          orderId: result.orderId,
          ticketIndex: result.ticketIndex,
          qrToken: result.qrToken,
          status: result.status,
          checkedInAt: result.checkedInAt,
          checkedInBy: result.checkedInBy ?? undefined,
          productNameSnapshot: localTicket?.productNameSnapshot,
        };

        void refetch();
        void props.onChanged?.();

        return result.outcome === "already_checked"
          ? { kind: "alreadyChecked", ticket }
          : { kind: "validated", ticket };
      } catch (e) {
        const message = e instanceof Error ? e.message : "Erreur inconnue";
        return { kind: "error", message };
      }
    },
    [eventId, markTicketByQr, refetch, props],
  );

  const displayedTickets = useMemo(() => {
    let rows = rawTickets;

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
        return aUsed ? 1 : -1;
      }

      return 0;
    });
  }, [rawTickets, filterMode, query]);

  const totalPages = Math.max(1, Math.ceil(totalTickets / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);

  const canGoPrev = safePage > 0;
  const canGoNext = safePage < totalPages - 1;

  return (
    <div className="adminTicketsSection">
      <div className="adminParticipantsHeader">
        <div>
          <h3 className="adminParticipantsTitle">Tickets</h3>
          <div className="adminParticipantsHint">
            {query.trim() || filterMode !== "all"
              ? `${displayedTickets.length} billet(s) sur cette page — ${totalTickets} au total`
              : `${totalTickets} billet(s) au total`}
          </div>
        </div>

        <div className="adminParticipantsHeaderRight">
          <Button variant="secondary" onClick={() => setScannerOpen(true)}>
            Scanner QR
          </Button>

          <Button variant="secondary" onClick={() => void refetch()}>
            Rafraîchir
          </Button>
        </div>
      </div>

      <FilterBar
        query={query}
        onQueryChange={(value) => {
          setQuery(value);
          setPage(0);
        }}
        selectValue={filterMode}
        onSelectChange={(value) => {
          setFilterMode(value as FilterMode);
          setPage(0);
        }}
        placeholder="Rechercher un billet…"
        selectOptions={[
          { value: "all", label: "Tous" },
          { value: "unused", label: "Non utilisés" },
          { value: "used", label: "Utilisés" },
        ]}
      />

      {markTicket.error ? <MessageBox variant="error">{markTicket.error}</MessageBox> : null}
      {markTicketByQr.error ? <MessageBox variant="error">{markTicketByQr.error}</MessageBox> : null}

      {totalTickets > 0 ? (
        <div className="adminListPager">
          <Button
            variant="secondary"
            disabled={!canGoPrev || loading}
            onClick={() => setPage((prev) => Math.max(0, prev - 1))}
          >
            Précédent
          </Button>

          <div className="adminListPager__label">
            Page {safePage + 1} / {totalPages}
            {displayedTickets.length > 0 ? ` — ${displayedTickets.length} ticket(s) affiché(s)` : ""}
          </div>

          <Button
            variant="secondary"
            disabled={!canGoNext || loading}
            onClick={() => setPage((prev) => Math.min(totalPages - 1, prev + 1))}
          >
            Suivant
          </Button>
        </div>
      ) : null}

      {loading ? (
        <div className="adminEventEmpty">Chargement des billets…</div>
      ) : error ? (
        <div className="adminEventEmpty">{error}</div>
      ) : displayedTickets.length === 0 ? (
        <div className="adminEventEmpty">
          {query.trim() || filterMode !== "all"
            ? "Aucun résultat avec ces filtres sur cette page."
            : "Aucun billet pour le moment."}
        </div>
      ) : (
        <div className="adminTicketsList">
          {displayedTickets.map((ticket: AdminEventTicket) => {
            const isUsed = Boolean(ticket.checkedInAt);
            const isInvalid = ticket.status === "invalid";

            return (
              <div key={ticket.id} className="adminTicketRow">
                <div className="adminTicketRowMain">
                  <div className="adminTicketRowTitle">{ticket.productNameSnapshot}</div>

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
                    <div className="adminTicketRowBuyer">Acheteur : {ticket.buyerEmail}</div>
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
                        const res = await markTicket.markTicketCheckedIn(ticket.id, eventId);
                        if (!res) return;
                        await refetch();
                        await props.onChanged?.();
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

      <TicketQrScannerFullscreen
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanToken={handleScanToken}
      />
    </div>
  );
}