import { Button } from "../../../ui/components";
import type { EventProduct } from "../../../domain/models/db/db.eventProducts.schema";

type CartSummary = {
  totalTickets: number;
  expectedSlots: { eventProductId: string }[];
  totalCents: number;
  currency: string;
};

type Props = {
  products: EventProduct[];
  quantities: Record<string, number>;
  updateQty: (productId: string, nextQty: number) => void;
  computeRemaining: (p: EventProduct) => number | null;
  cart: CartSummary;
};

export function AdminCreateOrderStep1({
  products,
  quantities,
  updateQty,
  computeRemaining,
  cart,
}: Props) {
  return (
    <div className="adminCO_Step">
      {products.length === 0 ? (
        <div className="adminCO_Empty">Aucun billet configuré.</div>
      ) : (
        products.map((p) => {
          const qty = Number(quantities[p.id] ?? 0) || 0;
          const remaining = computeRemaining(p);
          const soldOut = remaining === 0 && p.stockQty != null;

          const stockLabel = remaining == null ? "Illimité" : `Stock: ${remaining}`;
          const maxQty = remaining == null ? 99 : remaining;

          const createsAtt = p.createsAttendees === true;
          const perUnit = Number(p.attendeesPerUnit ?? 0) || 0;

          return (
            <div
              key={p.id}
              className={[
                "adminCO_TicketCard",
                soldOut ? "isSoldOut" : "",
              ].join(" ")}
            >
              <div className="adminCO_TicketRow">
                <div className="adminCO_TicketInfo">
                  <div className="adminCO_TicketName">{p.name}</div>
                  <div className="adminCO_TicketMeta">
                    {stockLabel}
                    {createsAtt
                      ? ` · ${perUnit} participant(s) / billet`
                      : ` · pas de formulaire participant`}
                  </div>
                </div>

                <div className="adminCO_QtyControls">
                  <Button
                    variant="secondary"
                    onClick={() => updateQty(p.id, qty - 1)}
                    disabled={soldOut || qty <= 0}
                  >
                    −
                  </Button>

                  <input
                    className="adminCO_QtyInput"
                    type="number"
                    min={0}
                    max={maxQty}
                    value={qty}
                    onChange={(e) => updateQty(p.id, Number(e.target.value))}
                    disabled={soldOut}
                  />

                  <Button
                    variant="secondary"
                    onClick={() => updateQty(p.id, qty + 1)}
                    disabled={soldOut || qty >= maxQty}
                  >
                    +
                  </Button>
                </div>
              </div>
            </div>
          );
        })
      )}

      <div className="adminCO_Recap">
        Récap : {cart.totalTickets} billet(s) · {cart.expectedSlots.length} participant(s) à renseigner ·{" "}
        {cart.totalCents / 100} {cart.currency}
      </div>
    </div>
  );
}
