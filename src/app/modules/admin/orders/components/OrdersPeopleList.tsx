import type { ComponentProps } from "react";
import { Fragment, useMemo, useRef, useState } from "react";

import { Button } from "@ui/components";
import { PersonCard } from "./PersonCard";
import { AttendeeEditorPanel } from "../../singleEvent/components/AttendeeEditorPanel";
import { formatDateTime } from "@helpers/normalize";
import type { Attendee } from "@shared/models/db/db.attendee.schema";
import { formatMoney } from "@helpers/normalize";
import type { OrderMeta } from "../hooks/useParticipantsViewModel";

export type FilledField = { key: string; label: string; value: string };
export type Identity = { title: string; subtitle: string };

type AttendeeEditorProps = ComponentProps<typeof AttendeeEditorPanel>;

type OrdersPeopleListProps = {
  groups: Array<[orderId: string, people: Attendee[]]>;
   orderMetaById: Map<string, OrderMeta>;
  filledFieldsByAttendeeId: Map<string, FilledField[]>;
  computeIdentity: (attendeeId: string) => Identity;

  isMobile: boolean;

  targetOrderId: string | null;
  deleteOrderLoading: boolean;
  onRequestDeleteOrder: (orderId: string) => void;

  editorOpen: boolean;
  editingAttendeeId: string | null;

  inlineEditorProps: Omit<
    AttendeeEditorProps,
    "layout" | "stickyTop" | "editorWidth" | "editorGap" | "left"
  >;

  onOpenEdit: (attendeeId: string, orderId: string) => void;

  pageSize?: number; // default 10
};

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

export function OrdersPeopleList(props: OrdersPeopleListProps) {
  const {
    groups,
    orderMetaById,
    filledFieldsByAttendeeId,
    computeIdentity,
    isMobile,
    targetOrderId,
    deleteOrderLoading,
    onRequestDeleteOrder,
    editorOpen,
    editingAttendeeId,
    inlineEditorProps,
    onOpenEdit,
    pageSize = 10,
  } = props;

  const topRef = useRef<HTMLDivElement | null>(null);

  // 0-based page index
  const [pageIndex, setPageIndex] = useState(0);

  const pageCount = Math.max(1, Math.ceil(groups.length / pageSize));

  // pageIndex clamped "virtuellement" (sans setState)
  const safePageIndex = useMemo(() => clamp(pageIndex, 0, pageCount - 1), [pageIndex, pageCount]);

  const page = safePageIndex + 1;

  const pagedGroups = useMemo(() => {
    const start = safePageIndex * pageSize;
    return groups.slice(start, start + pageSize);
  }, [groups, safePageIndex, pageSize]);

  const canPrev = safePageIndex > 0;
  const canNext = safePageIndex < pageCount - 1;

  function goToPageIndex(nextIndex: number) {
    const clampedIndex = clamp(nextIndex, 0, pageCount - 1);
    setPageIndex(clampedIndex);

    requestAnimationFrame(() => {
      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <>
      <div ref={topRef} />

      {pageCount > 1 ? (
        <div className="adminOrdersPagination">
          <Button
            variant="secondary"
            onClick={() => goToPageIndex(safePageIndex - 1)}
            disabled={!canPrev}
          >
            Précédent
          </Button>

          <div className="adminOrdersPaginationInfo">
            Page <b>{page}</b> / {pageCount} — <span>{groups.length}</span> commandes
          </div>

          <Button
            variant="secondary"
            onClick={() => goToPageIndex(safePageIndex + 1)}
            disabled={!canNext}
          >
            Suivant
          </Button>
        </div>
      ) : null}

      <div className="adminOrdersGrid">
        {pagedGroups.map(([orderId, people]) => {
          const meta = orderMetaById.get(orderId);
          const orderNumber = meta?.orderNumber ?? orderId.slice(0, 8);
          const isDeletingThisOrder = deleteOrderLoading && targetOrderId === orderId;

          const total = meta?.totalCents ?? 0;
          const paid = meta?.paidCents ?? 0;
          const due = meta?.dueCents ?? Math.max(0, total - paid);
          const currency = meta?.currency ?? "EUR";
          const isFree = total === 0;
          return (
            <div key={orderId} className="adminOrderCard">
              <div className="adminOrderHeader">
                <div>
                  <div className="adminOrderTitle">Commande {orderNumber}</div>
                  <div className="adminOrderSub">Créée le {formatDateTime(meta?.createdAt)}</div>
                  {isFree ? (
                    <div className="adminOrderFree">Gratuit</div>
                  ) : (
                    <div className="adminOrderAmountsCompact">
                      <span>
                        <b>Total</b> {formatMoney(total, currency)}
                      </span>

                      <span className="adminDot">•</span>

                      <span>
                        <b>Payé</b> {formatMoney(paid, currency)}
                      </span>

                      <span className="adminDot">•</span>

                      <span className="adminOrderDue">
                        <b>Reste</b> {formatMoney(due, currency)}
                      </span>
                    </div>
                  )}
                  </div>

                <div className="adminOrderHeaderRight">
                  <span className="adminOrderPill">
                    {people.length} inscrit{people.length > 1 ? "s" : ""}
                  </span>

                  <Button
                    variant="danger"
                    onClick={() => onRequestDeleteOrder(orderId)}
                    disabled={isDeletingThisOrder}
                  >
                    Supprimer la commande
                  </Button>
                </div>
              </div>

              <div className="adminOrderPeople">
                {people.map((att) => {
                  const identity = computeIdentity(att.id);
                  const filled = filledFieldsByAttendeeId.get(att.id) ?? [];
                  const showInlineEditor = isMobile && editorOpen && editingAttendeeId === att.id;

                  return (
                    <Fragment key={att.id}>
                        <div className="adminPersonRow">
                      <PersonCard
                        att={att}
                        identity={identity}
                        filled={filled}
                        onEdit={() => onOpenEdit(att.id, orderId)}
                      />
                      </div>

                      {showInlineEditor ? (
                        <div className="adminInlineEditorWrap">
                          <AttendeeEditorPanel {...inlineEditorProps} layout="inline" />
                        </div>
                      ) : null}
                    </Fragment>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {pageCount > 1 ? (
        <div className="adminOrdersPagination adminOrdersPaginationBottom">
          <Button
            variant="secondary"
            onClick={() => goToPageIndex(safePageIndex - 1)}
            disabled={!canPrev}
          >
            Précédent
          </Button>

          <div className="adminOrdersPaginationInfo">
            Page <b>{page}</b> / {pageCount}
          </div>

          <Button
            variant="secondary"
            onClick={() => goToPageIndex(safePageIndex + 1)}
            disabled={!canNext}
          >
            Suivant
          </Button>
        </div>
      ) : null}
    </>
  );
}