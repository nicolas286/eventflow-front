import { useMemo, useState } from "react";

import type { EventProducts } from "../../../../domain/models/db/db.eventProducts.schema";
import type { CreateEventProductInput } from "../../../../domain/models/admin/admin.createEventProduct.schema";
import type { UpdateEventProductPatch } from "../../../../gateways/supabase/repositories/dashboard/updateEventProductRepo";

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
  onUpdate: (input: { productId: string; patch: UpdateEventProductPatch }) => Promise<void>;
  updateLoading?: boolean;
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
    onUpdate,
    updateLoading,
  } = props;

  const [editing, setEditing] = useState<TicketDraft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  function productToDraft(p: any): TicketDraft {
    return {
      name: String(p?.name ?? ""),
      description: String(p?.description ?? ""),
      priceCents: clampInt(p?.priceCents ?? 0, 0),
      currency: "EUR",
      stockQty: p?.stockQty == null ? null : clampInt(p.stockQty, 0),
      sortOrder: clampInt(p?.sortOrder ?? 0, 0),
      createsAttendees: Boolean(p?.createsAttendees ?? true),
      attendeesPerUnit: clampInt(p?.attendeesPerUnit ?? 1, 1) || 1,
      isActive: Boolean(p?.isActive ?? true),
      isGatekeeper: Boolean(p?.isGatekeeper ?? false),
      closeEventWhenSoldOut: Boolean(p?.closeEventWhenSoldOut ?? false),
    };
  }

  function openEdit(p: any) {
    setEditing(productToDraft(p));
    setEditingId(String(p.id));
  }
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

  function openCreate() {
  setEditingId(null);
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
      setEditingId(null);
    }


  async function save() {
  if (!editing) return;
  if (!event?.id) return;

  const name = String(editing.name ?? "").trim();
  if (!name) return;

  // payload commun (draft -> input)
  const base: CreateEventProductInput = {
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

  if (!editingId) {
    // ✅ create
    await onCreate(base);
  } else {
    // ✅ update (patch)
    const patch: UpdateEventProductPatch = {
      name: base.name,
      description: base.description,
      priceCents: base.priceCents,
      currency: base.currency,
      stockQty: base.stockQty,
      sortOrder: base.sortOrder,
      createsAttendees: base.createsAttendees,
      attendeesPerUnit: base.attendeesPerUnit,
      isActive: base.isActive,
      isGatekeeper: base.isGatekeeper,
      closeEventWhenSoldOut: base.closeEventWhenSoldOut,
    };

    await onUpdate({ productId: editingId, patch });
  }

  closeEditor();
  onChanged?.();
}

    function getSoldQty(p: any) {
      return clampInt(p?.soldQty ?? p?.sold_qty ?? 0, 0);
    }

    function formatStockLine(sold: number, stockQty: number | null | undefined) {
      if (stockQty == null) return `${sold} / illimité`;
      const stock = clampInt(stockQty, 0);
      return `${sold} / ${stock}`;
    }



  return (
    <div className="adminTickets">
      <div className="adminEventHeaderRow">
        <div>
          <h3 style={{ margin: 0 }}>Tickets</h3>
          <div className="adminEventHint">Créez, modifiez ou désactivez vos billets.</div>
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
              const currency = String(p.currency ?? "EUR");
              const active = Boolean(p.isActive ?? true);
              const sold = getSoldQty(p);
              const stockLine = formatStockLine(sold, p.stockQty);


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
                    <span>Stock : {stockLine}</span>
                  </div>

                  <div className="adminTicketMeta">
                    {p.createsAttendees ? (
                      <span>
                        Ce billet crée{" "}
                        <strong>{p.attendeesPerUnit ?? 1}</strong>{" "}
                        participant{(p.attendeesPerUnit ?? 1) > 1 ? "s" : ""}{" "}
                        qui devra{(p.attendeesPerUnit ?? 1) > 1 ? "ont" : ""} remplir le formulaire
                      </span>
                    ) : (
                      <span>
                        Ce billet ne crée <strong>aucun participant</strong>
                      </span>
                    )}
                  </div>


                  <div className="adminTicketStats">
                    <div className="adminTicketStat">
                      <div className="adminTicketStatLabel">Vendus</div>
                      <div className="adminTicketStatValue">{sold}</div>
                    </div>
                  </div>

                  {p.description ? <div className="adminTicketDesc">{p.description}</div> : null}

                  <div className="adminTicketActions">
                    <button
                    type="button"
                    className="adminTicketBtn"
                    onClick={() => openEdit(p)}
                    disabled={Boolean(updateLoading)}
                    title={updateLoading ? "Enregistrement en cours" : undefined}
                  >
                    Modifier
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
                  <div className="adminTicketsEditorTitle">
                  {editingId ? "Modifier ticket" : "Nouveau ticket"}
                </div>

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
                  disabled={
                    !String(editing.name ?? "").trim() ||
                    (editingId ? Boolean(updateLoading) : createLoading)
                  }
                >
                  {editingId
                    ? updateLoading
                      ? "Enregistrement..."
                      : "Mettre à jour"
                    : createLoading
                      ? "Enregistrement..."
                      : "Enregistrer"}
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
