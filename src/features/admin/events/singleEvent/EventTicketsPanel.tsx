import { useMemo, useState } from "react";

import type { EventProducts } from "../../../../domain/models/db/db.eventProducts.schema";
import type { CreateEventProductInput } from "../../../../domain/models/admin/admin.createEventProduct.schema";

type OrderItemLike = {
  eventProductId?: string | null;
  event_product_id?: string | null;
  quantity?: number | null;
  unitPriceCents?: number | null;
  unit_price_cents?: number | null;
  priceCents?: number | null;
};

type Props = {
  orgId: string;
  event: { id: string } | null;
  products: EventProducts;
  orders: unknown[];
  orderItems: OrderItemLike[];
  payments: unknown[];

  onCreate: (input: CreateEventProductInput) => Promise<void>;

  createLoading?: boolean;
  createError?: string | null;

  onRemove?: (productId: string) => Promise<void>;
  deleteLoading?: boolean;
  deleteError?: string | null;

  onChanged?: () => void;
};

function formatMoney(cents: number, currency: string) {
  const v = Number.isFinite(cents) ? cents / 100 : 0;
  try {
    return new Intl.NumberFormat("fr-BE", { style: "currency", currency }).format(v);
  } catch {
    return `${v.toFixed(2)} ${currency}`;
  }
}

function clampInt(v: unknown, fallback = 0) {
  const n = typeof v === "number" ? v : Number(String(v ?? ""));
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

function toNullIfEmpty(s: string) {
  const t = (s ?? "").trim();
  return t.length ? t : null;
}

type TicketDraft = {
  name: string;
  description: string;
  priceCents: number;
  currency: "EUR"; // ⚠️ ta RPC n'accepte que EUR
  stockQty: number | null;
  sortOrder: number;
  createsAttendees: boolean;
  attendeesPerUnit: number;
  isActive: boolean;
  isGatekeeper: boolean;
  closeEventWhenSoldOut: boolean;
};



export function EventTicketsPanel(props: Props) {
  const {
    event,
    products,
    orderItems,
    onCreate,
    createLoading = false,
    createError = null,
    onRemove,
    deleteLoading = false,
    deleteError = null,
    onChanged,
  } = props;

  const [editing, setEditing] = useState<TicketDraft | null>(null);

  const sorted = useMemo(() => {
    const arr = Array.isArray(products) ? [...products] : [];
    arr.sort((a, b) => (a?.sortOrder ?? 0) - (b?.sortOrder ?? 0));
    return arr;
  }, [products]);

  async function handleRemove(productId: string) {
  if (!onRemove) return;

  const ok = window.confirm("Supprimer ce ticket ? (les commandes passées restent intactes)");
  if (!ok) return;

  await onRemove(productId);
  onChanged?.();
  }

  const statsByProductId = useMemo(() => {
    const map = new Map<string, { soldQty: number; grossCents: number; currency: string }>();
    for (const p of sorted) {
      map.set(String(p.id), {
        soldQty: 0,
        grossCents: 0,
        currency: String(p.currency ?? "EUR"),
      });
    }

    for (const it of orderItems ?? []) {
      const pid = String(it?.eventProductId ?? it?.event_product_id ?? "");
      if (!pid) continue;

      const qty = clampInt(it?.quantity ?? 0, 0);
      const unit = clampInt(it?.unitPriceCents ?? it?.unit_price_cents ?? it?.priceCents ?? 0, 0);

      const prev = map.get(pid);
      if (!prev) continue;

      prev.soldQty += qty;
      prev.grossCents += qty * unit;
      map.set(pid, prev);
    }
    return map;
  }, [sorted, orderItems]);

  function openCreate() {
    setEditing({
      name: "",
      description: "",
      priceCents: 0,
      currency: "EUR",
      stockQty: null,
      sortOrder: (sorted.at(-1)?.sortOrder ?? 0) + 10,
      createsAttendees: true,
      attendeesPerUnit: 1,
      isActive: true,
      isGatekeeper: false,
      closeEventWhenSoldOut: false,
    });
  }

  function closeEditor() {
    setEditing(null);
  }

  async function save() {
    if (!editing) return;
    if (!event?.id) return;

    const name = String(editing.name ?? "").trim();
    if (!name) return;

    const input: CreateEventProductInput = {
      eventId: event.id,
      name,
      description: toNullIfEmpty(editing.description),
      priceCents: clampInt(editing.priceCents, 0),
      currency: "EUR",
      stockQty: editing.stockQty == null ? null : clampInt(editing.stockQty, 0),
      sortOrder: clampInt(editing.sortOrder, 0),
      createsAttendees: Boolean(editing.createsAttendees),
      attendeesPerUnit: clampInt(editing.attendeesPerUnit, 1) || 1,
      isActive: Boolean(editing.isActive),
      isGatekeeper: Boolean(editing.isGatekeeper),
      closeEventWhenSoldOut: Boolean(editing.closeEventWhenSoldOut),
    };

    


    await onCreate(input);
    closeEditor();
    onChanged?.();
  }

  return (
    <div className="adminTickets">
      <div className="adminEventHeaderRow">
        <div>
          <h3 style={{ margin: 0 }}>Tickets</h3>
          <div className="adminEventHint">Crée et édite tes billets. Tu peux aussi les désactiver.</div>
        </div>

        <div className="adminEventHeaderActions">
          <button type="button" className="adminEventBtn" onClick={openCreate}>
            Nouveau ticket
          </button>
        </div>
      </div>

      <div className="adminTicketsGrid">
        <div className="adminTicketsList">
          {sorted.length === 0 ? (
            <div className="adminEventEmpty">Aucun ticket. Clique sur “Nouveau ticket”.</div>
          ) : (
            sorted.map((p) => {
              const s = statsByProductId.get(String(p.id));
              const currency = String(p.currency ?? "EUR");
              const active = Boolean(p.isActive ?? true);
              const sold = s?.soldQty ?? 0;
              const gross = s?.grossCents ?? 0;

              return (
                <div key={p.id} className={active ? "adminTicketCard" : "adminTicketCard isInactive"}>
                  <div className="adminTicketTop">
                    <div className="adminTicketTitle">{p.name}</div>
                    <div className={active ? "adminTicketPill" : "adminTicketPill isOff"}>
                      {active ? "Actif" : "Inactif"}
                    </div>
                  </div>

                  <div className="adminTicketMeta">
                    <span className="adminTicketStrong">{formatMoney(p.priceCents ?? 0, currency)}</span>
                    <span>•</span>
                    <span>Stock : {p.stockQty ?? "∞"}</span>
                    <span>•</span>
                    <span>Ordre : {p.sortOrder ?? 0}</span>
                  </div>

                  <div className="adminTicketMeta">
                    <span>Participants : {p.createsAttendees ? "Oui" : "Non"}</span>
                    <span>•</span>
                    <span>/ billet : {p.attendeesPerUnit ?? 0}</span>
                  </div>

                  <div className="adminTicketStats">
                    <div className="adminTicketStat">
                      <div className="adminTicketStatLabel">Vendus</div>
                      <div className="adminTicketStatValue">{sold}</div>
                    </div>
                    <div className="adminTicketStat">
                      <div className="adminTicketStatLabel">CA brut</div>
                      <div className="adminTicketStatValue">{formatMoney(gross, currency)}</div>
                    </div>
                  </div>

                  {p.description ? <div className="adminTicketDesc">{p.description}</div> : null}

                  <div className="adminTicketActions">
                    <button type="button" className="adminTicketBtn" disabled title="Pas encore dispo">
                      Éditer
                    </button>
                    <button
                      type="button"
                      className="adminTicketBtn danger"
                      onClick={() => void handleRemove(String(p.id))}
                      disabled={!onRemove || deleteLoading}
                      title={!onRemove ? "Suppression non dispo" : undefined}
                    >
                      {deleteLoading ? "Suppression..." : "Supprimer"}
                    </button>

                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="adminTicketsEditor">
          {editing ? (
            <div className="adminTicketsEditorCard">
              <div className="adminTicketsEditorHeader">
                <div>
                  <div className="adminTicketsEditorTitle">Nouveau ticket</div>
                  <div className="adminEventHint">Les prix sont en centimes.</div>
                </div>

                <button type="button" className="adminTicketBtn" onClick={closeEditor}>
                  Fermer
                </button>
              </div>

              {createError ? (
                <div className="adminEventHint" style={{ marginTop: 10, color: "#b91c1c" }}>
                  {createError}
                </div>
              ) : null}

              {deleteError ? (
              <div className="adminEventHint" style={{ marginTop: 10, color: "#b91c1c" }}>
                {deleteError}
              </div>
            ) : null}


              <div className="adminEventFormGrid" style={{ marginTop: 12 }}>
                <div className="adminEventField">
                  <div className="adminEventLabel">Nom</div>
                  <input
                    className="adminEventInput"
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  />
                </div>

                <div className="adminEventField">
                  <div className="adminEventLabel">Ordre</div>
                  <input
                    className="adminEventInput"
                    type="number"
                    value={editing.sortOrder}
                    onChange={(e) => setEditing({ ...editing, sortOrder: clampInt(e.target.value, 0) })}
                  />
                </div>

                <div className="adminEventField">
                  <div className="adminEventLabel">Prix (centimes)</div>
                  <input
                    className="adminEventInput"
                    type="number"
                    value={editing.priceCents}
                    onChange={(e) => setEditing({ ...editing, priceCents: clampInt(e.target.value, 0) })}
                  />
                </div>

                <div className="adminEventField">
                  <div className="adminEventLabel">Devise</div>
                  <select className="adminEventInput" value={editing.currency} disabled>
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                    <option value="GBP">GBP</option>
                    <option value="CHF">CHF</option>
                  </select>
                </div>

                <div className="adminEventField">
                  <div className="adminEventLabel">Stock (vide = illimité)</div>
                  <input
                    className="adminEventInput"
                    type="number"
                    value={editing.stockQty ?? ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        stockQty: e.target.value === "" ? null : clampInt(e.target.value, 0),
                      })
                    }
                  />
                </div>

                <div className="adminEventField">
                  <div className="adminEventLabel">Actif</div>
                  <label className="adminEventToggle">
                    <input
                      type="checkbox"
                      checked={Boolean(editing.isActive)}
                      onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })}
                    />
                    <span>{editing.isActive ? "Actif" : "Inactif"}</span>
                  </label>
                </div>

                <div className="adminEventField">
                  <div className="adminEventLabel">Crée des participants</div>
                  <label className="adminEventToggle">
                    <input
                      type="checkbox"
                      checked={Boolean(editing.createsAttendees)}
                      onChange={(e) => setEditing({ ...editing, createsAttendees: e.target.checked })}
                    />
                    <span>{editing.createsAttendees ? "Oui" : "Non"}</span>
                  </label>
                </div>

                <div className="adminEventField">
                  <div className="adminEventLabel">Participants / billet</div>
                  <input
                    className="adminEventInput"
                    type="number"
                    value={editing.attendeesPerUnit}
                    onChange={(e) => setEditing({ ...editing, attendeesPerUnit: clampInt(e.target.value, 0) })}
                    disabled={!editing.createsAttendees}
                  />
                </div>

                <div className="adminEventField adminEventFieldSpan2">
                  <div className="adminEventLabel">Description</div>
                  <textarea
                    className="adminEventTextarea"
                    value={editing.description}
                    onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="adminTicketsEditorFooter">
                <button
                  type="button"
                  className="adminEventBtn"
                  onClick={() => void save()}
                  disabled={!String(editing.name ?? "").trim() || createLoading}
                >
                  {createLoading ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </div>
          ) : (
            <div className="adminEventEmpty">Sélectionne un ticket (ou “Nouveau ticket”).</div>
          )}
        </div>
      </div>
    </div>
  );
}
