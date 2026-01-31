import { useMemo } from "react";

type AnyRecord = Record<string, any>;

function getFirst<T = any>(obj: AnyRecord | null | undefined, keys: string[]): T | undefined {
  if (!obj) return undefined;
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null) return v as T;
  }
  return undefined;
}

function toRows(value: any): AnyRecord[] {
  if (Array.isArray(value)) return value as AnyRecord[];
  if (value && Array.isArray(value.rows)) return value.rows as AnyRecord[];
  return [];
}

function formatMoneyEUR(cents: number | null | undefined): string {
  const n = typeof cents === "number" ? cents : 0;
  return new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR" }).format(n / 100);
}

function formatDateTime(value: any): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat("fr-BE", { dateStyle: "medium", timeStyle: "short" }).format(d);
}

export function SingleEventParticipantsSection(props: { data: AnyRecord }) {
  const data = props.data;

  const attendeeContainer =
    data?.attendees ??
    data?.participants ??
    data?.people ??
    data?.registrations ??
    data?.eventAttendees ??
    data?.event_attendees ??
    data?.attendeeRows ??
    data?.attendee_rows ??
    null;

  const attendeeRows = useMemo(() => toRows(attendeeContainer), [attendeeContainer]);
  const ordersArr = useMemo(() => toRows(data.orders), [data.orders]);
  const orderItemsArr = useMemo(() => toRows(data.orderItems ?? data.order_items), [data.orderItems, data.order_items]);
  const productsArr = useMemo(() => toRows(data.products), [data.products]);
  const paymentsArr = useMemo(() => toRows(data.payments), [data.payments]);

  return (
    <div className="adminParticipants adminSingleEventParticipants">
      <div className="adminParticipantsHeader">
        <h3 className="adminParticipantsTitle">Commandes</h3>
        <div className="adminParticipantsHint">
          {ordersArr.length} commande(s) • {attendeeRows.length} ticket(s)
        </div>
      </div>

      {ordersArr.length > 0 ? (
        <OrderCards
          attendeeRows={attendeeRows}
          orders={ordersArr}
          orderItems={orderItemsArr}
          products={productsArr}
          payments={paymentsArr}
        />
      ) : (
        <div className="adminEventEmpty">Aucune commande pour le moment.</div>
      )}
    </div>
  );
}

function OrderCards(props: {
  attendeeRows: AnyRecord[];
  orders: AnyRecord[];
  orderItems: AnyRecord[];
  products: AnyRecord[];
  payments: AnyRecord[];
}) {
  const { attendeeRows, orders, orderItems, products, payments } = props;

  const productById = useMemo(() => {
    const m = new Map<string, AnyRecord>();
    for (const p of products) {
      const id = getFirst<string>(p, ["id", "productId"]);
      if (id) m.set(id, p);
    }
    return m;
  }, [products]);

  const paymentsByOrderId = useMemo(() => {
    const m = new Map<string, AnyRecord[]>();
    for (const pay of payments) {
      const oid = getFirst<string>(pay, ["orderId", "order_id"]);
      if (!oid) continue;
      const arr = m.get(oid) ?? [];
      arr.push(pay);
      m.set(oid, arr);
    }
    return m;
  }, [payments]);

  const orderItemsByOrderId = useMemo(() => {
    const m = new Map<string, AnyRecord[]>();
    for (const it of orderItems) {
      const oid = getFirst<string>(it, ["orderId", "order_id"]);
      if (!oid) continue;
      const arr = m.get(oid) ?? [];
      arr.push(it);
      m.set(oid, arr);
    }
    return m;
  }, [orderItems]);

  const ticketsCountByOrderId = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const r of attendeeRows) {
      const oid = getFirst<string>(r, ["orderId", "order_id"]);
      if (!oid) continue;

      const rid = getFirst<string>(r, ["id"]) ?? "";
      const idx = getFirst<number>(r, ["attendeeIndex", "attendee_index", "index"]);
      const fallback = idx === undefined || idx === null ? "" : `${oid}::${idx}`;
      const key = rid || fallback;
      if (!key) continue;

      const set = m.get(oid) ?? new Set<string>();
      set.add(key);
      m.set(oid, set);
    }

    const counts = new Map<string, number>();
    for (const [oid, set] of m.entries()) counts.set(oid, set.size);
    return counts;
  }, [attendeeRows]);

  const uniqueOrders = useMemo(() => {
    const map = new Map<string, AnyRecord>();

    for (const o of orders) {
      const oid = getFirst<string>(o, ["id", "orderId", "order_id"]);
      if (!oid) continue;

      const prev = map.get(oid);
      if (!prev) {
        map.set(oid, o);
        continue;
      }

      const a = getFirst<string>(prev, ["updatedAt", "updated_at", "createdAt", "created_at"]) ?? "";
      const b = getFirst<string>(o, ["updatedAt", "updated_at", "createdAt", "created_at"]) ?? "";
      if (b && a && b.localeCompare(a) > 0) map.set(oid, o);
    }

    return Array.from(map.values());
  }, [orders]);

  const sortedOrders = useMemo(() => {
    const arr = [...uniqueOrders];
    arr.sort((a, b) => {
      const ad = getFirst<string>(a, ["createdAt", "created_at"]) ?? "";
      const bd = getFirst<string>(b, ["createdAt", "created_at"]) ?? "";
      if (ad && bd) return bd.localeCompare(ad);

      const aid = getFirst<string>(a, ["id", "orderId", "order_id"]) ?? "";
      const bid = getFirst<string>(b, ["id", "orderId", "order_id"]) ?? "";
      return bid.localeCompare(aid);
    });
    return arr;
  }, [uniqueOrders]);

  function itemLabel(it: AnyRecord): string {
    const pid = getFirst<string>(it, ["productId", "product_id"]);
    const product = pid ? productById.get(pid) : undefined;
    return (
      getFirst<string>(product, ["title", "name", "label"]) ??
      getFirst<string>(it, ["productNameSnapshot", "product_name_snapshot", "productTitle", "product_title"]) ??
      "Article"
    );
  }

  function itemQty(it: AnyRecord): number {
    return Number(getFirst(it, ["quantity", "qty"])) || 0;
  }

  return (
    <div className="adminParticipantsGrid">
      {sortedOrders.map((order) => {
        const orderId = getFirst<string>(order, ["id", "orderId", "order_id"]) ?? "";
        if (!orderId) return null;

        const orderNumber =
          getFirst<string>(order, ["publicId", "public_id", "number", "ref", "reference"]) ??
          orderId.slice(0, 8);

        const status = getFirst<string>(order, ["status", "state"]) ?? "—";
        const created = formatDateTime(getFirst(order, ["createdAt", "created_at"])) || "";

        const totalCents =
          Number(getFirst(order, ["totalCents", "total_cents", "amountCents", "amount_cents"])) || 0;
        const paidCents =
          Number(getFirst(order, ["paidCents", "paid_cents", "amountPaidCents", "amount_paid_cents"])) || 0;

        const pays = paymentsByOrderId.get(orderId) ?? [];
        const paymentState =
          getFirst<string>(pays[0], ["status", "state"]) ??
          (paidCents >= totalCents && totalCents > 0 ? "paid" : paidCents > 0 ? "partial" : "unpaid");

        const ticketsCount = ticketsCountByOrderId.get(orderId) ?? 0;

        const items = orderItemsByOrderId.get(orderId) ?? [];
        const aggregated = (() => {
          const agg = new Map<string, { label: string; qty: number }>();
          for (const it of items) {
            const pid = getFirst<string>(it, ["productId", "product_id"]) ?? `__noid_${itemLabel(it)}`;
            const current = agg.get(pid);
            const qty = itemQty(it);
            if (!current) agg.set(pid, { label: itemLabel(it), qty });
            else current.qty += qty;
          }
          return Array.from(agg.values());
        })();

        return (
          <div key={orderId} className="adminParticipantCard">
            <div className="adminParticipantTop">
              <div className="adminParticipantIdentity">
                <div className="adminParticipantName">Commande {orderNumber}</div>
                <div className="adminParticipantSub">{created ? created : null}</div>
              </div>

              <div className="adminParticipantPills">
                <span className="adminParticipantPill isStrong">
                  {ticketsCount} ticket{ticketsCount > 1 ? "s" : ""}
                </span>
                <span className="adminParticipantPill">{formatMoneyEUR(paidCents)}</span>
              </div>
            </div>

            <div className="adminParticipantStats">
              <div className="adminParticipantStat">
                <div className="adminParticipantStatLabel">Statut</div>
                <div className="adminParticipantStatValue">{status}</div>
              </div>
              <div className="adminParticipantStat">
                <div className="adminParticipantStatLabel">Paiement</div>
                <div className="adminParticipantStatValue">
                  {paymentState === "paid" ? "Payée" : paymentState === "partial" ? "Partielle" : "Non payée"}
                </div>
              </div>
            </div>

            <div className="adminParticipantOrders">
              <div className="adminParticipantOrder">
                <div className="adminParticipantOrderTop">
                  <div className="adminParticipantOrderTitle">Articles achetés</div>
                  <div className="adminParticipantOrderMeta">
                    <span className="adminParticipantBadge">{status}</span>
                    <span
                      className={
                        paymentState === "paid"
                          ? "adminParticipantBadge isPaid"
                          : paymentState === "partial"
                          ? "adminParticipantBadge isPartial"
                          : "adminParticipantBadge isUnpaid"
                      }
                    >
                      {paymentState === "paid"
                        ? "Payée"
                        : paymentState === "partial"
                        ? "Partielle"
                        : "Non payée"}
                    </span>
                  </div>
                </div>

                <div className="adminParticipantOrderSub">
                  <span>
                    {paidCents > 0
                      ? `${formatMoneyEUR(paidCents)} / ${formatMoneyEUR(totalCents)}`
                      : formatMoneyEUR(totalCents)}
                  </span>
                </div>

                <div className="adminParticipantOrderItems">
                  {aggregated.length > 0 ? (
                    aggregated.map((it, idx) => (
                      <div key={`${it.label}-${idx}`} className="adminParticipantOrderItem">
                        <div className="adminParticipantOrderItemTitle">{it.label}</div>
                        <div className="adminParticipantOrderItemRight">
                          <span className="adminParticipantOrderQty">x{it.qty}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="adminParticipantOrderEmpty">Aucun article trouvé.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
