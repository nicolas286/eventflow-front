import { Button } from "../../../ui/components";
import type { EventProductUI } from "../../../domain/models/admin/ui/eventDetail/admin.eventDetailProduct.ui.schema";

type CartSummary = {
  totalTickets: number;
  expectedSlots: { eventProductId: string }[];
  totalCents: number;
  currency: string;
};

type Props = {
  products: EventProductUI[];
  quantities: Record<string, number>;
  updateQty: (productId: string, nextQty: number) => void;
  computeRemaining: (p: EventProductUI) => number | null;
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
    <div style={{ display: "grid", gap: 10 }}>
      {products.length === 0 ? (
        <div style={{ opacity: 0.8 }}>Aucun billet configuré.</div>
      ) : (
        products.map((p) => {
          const qty = Number(quantities[p.id] ?? 0) || 0;
          const remaining = computeRemaining(p);
          const soldOut = remaining === 0 && p.stockQty != null;

          const stockLabel =
            remaining == null ? "Illimité" : `Stock: ${remaining}`;

          const maxQty = remaining == null ? 99 : remaining;

          const createsAtt = p.createsAttendees === true;
          const perUnit = Number(p.attendeesPerUnit ?? 0) || 0;

          return (
            <div
              key={p.id}
              style={{
                border: "1px solid rgba(0,0,0,0.10)",
                borderRadius: 12,
                padding: 12,
                opacity: soldOut ? 0.6 : 1,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 900 }}>{p.name}</div>
                  <div
                    style={{
                      opacity: 0.75,
                      fontSize: 13,
                      marginTop: 2,
                    }}
                  >
                    {stockLabel}
                    {createsAtt
                      ? ` · ${perUnit} participant(s) / billet`
                      : ` · pas de formulaire participant`}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Button
                    variant="secondary"
                    onClick={() => updateQty(p.id, qty - 1)}
                    disabled={soldOut || qty <= 0}
                  >
                    −
                  </Button>

                  <input
                    type="number"
                    min={0}
                    max={maxQty}
                    value={qty}
                    onChange={(e) =>
                      updateQty(p.id, Number(e.target.value))
                    }
                    style={{
                      width: 64,
                      padding: "8px 10px",
                      borderRadius: 10,
                      border: "1px solid rgba(0,0,0,0.12)",
                      outline: "none",
                      textAlign: "center",
                    }}
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

      {/* recap */}
      <div
        style={{
          borderTop: "1px solid rgba(0,0,0,0.08)",
          paddingTop: 10,
          opacity: 0.85,
          fontSize: 13,
        }}
      >
        Récap : {cart.totalTickets} billet(s) ·{" "}
        {cart.expectedSlots.length} participant(s) à renseigner ·{" "}
        {cart.totalCents / 100} {cart.currency}
      </div>
    </div>
  );
}
