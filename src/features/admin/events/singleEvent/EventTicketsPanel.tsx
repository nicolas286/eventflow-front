import { useMemo, useState } from "react";

type SupabaseLike = {
  from: (table: string) => {
    insert: (values: any) => any;
    update: (values: any) => any;
    delete: () => any;
    eq: (col: string, val: any) => any;
    select: (cols?: string) => any;
    single: () => any;
  };
};

type Props = {
  supabase: SupabaseLike;
  orgId: string;
  event: any;
  products: any[];
  orders: any[];
  orderItems: any[];
  payments: any[];
  onChanged?: () => void;
};

const TICKETS_TABLE = "event_products";

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

export function EventTicketsPanel(props: Props) {
  const { supabase, event, products, orderItems, onChanged } = props;

  const [editing, setEditing] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);

  const sorted = useMemo(() => {
    const arr = Array.isArray(products) ? [...products] : [];
    arr.sort((a, b) => (a?.sortOrder ?? 0) - (b?.sortOrder ?? 0));
    return arr;
  }, [products]);

  const statsByProductId = useMemo(() => {
    const map = new Map<string, { soldQty: number; grossCents: number; currency: string }>();
    for (const p of sorted) {
      if (!p?.id) continue;
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
    setCreating(true);
    setEditing({
      id: null,
      name: "",
      description: "",
      priceCents: 0,
      currency: "EUR",
      stockQty: null as number | null,
      sortOrder: (sorted.at(-1)?.sortOrder ?? 0) + 10,
      createsAttendees: true,
      attendeesPerUnit: 1,
      isActive: true,
    });
  }

  function openEdit(p: any) {
    setCreating(false);
    setEditing({
      id: p.id,
      name: p.name ?? "",
      description: p.description ?? "",
      priceCents: clampInt(p.priceCents ?? p.price_cents ?? 0, 0),
      currency: p.currency ?? "EUR",
      stockQty: p.stockQty ?? p.stock_qty ?? null,
      sortOrder: p.sortOrder ?? p.sort_order ?? 0,
      createsAttendees: Boolean(p.createsAttendees ?? p.creates_attendees),
      attendeesPerUnit: clampInt(p.attendeesPerUnit ?? p.attendees_per_unit ?? 0, 0),
      isActive: p.isActive ?? p.is_active ?? true,
    });
  }

  function closeEditor() {
    setEditing(null);
    setCreating(false);
  }

  async function save() {
    if (!editing) return;
    if (!event?.id) return;

    const payload = {
      event_id: event.id,
      name: String(editing.name ?? "").trim(),
      description: toNullIfEmpty(String(editing.description ?? "")),
      price_cents: clampInt(editing.priceCents ?? 0, 0),
      currency: String(editing.currency ?? "EUR"),
      stock_qty: editing.stockQty === "" || editing.stockQty == null ? null : clampInt(editing.stockQty, 0),
      sort_order: clampInt(editing.sortOrder ?? 0, 0),
      creates_attendees: Boolean(editing.createsAttendees),
      attendees_per_unit: clampInt(editing.attendeesPerUnit ?? 0, 0),
      is_active: Boolean(editing.isActive),
    };

    if (!payload.name) return;

    if (creating) {
      const { error } = await supabase.from(TICKETS_TABLE).insert(payload);
      if (error) return;
      closeEditor();
      onChanged?.();
      return;
    }

    const { error } = await supabase
      .from(TICKETS_TABLE)
      .update(payload)
      .eq("id", editing.id);

    if (error) return;

    closeEditor();
    onChanged?.();
  }

  async function remove(p: any) {
    const id = p?.id;
    if (!id) return;

    const soft = await supabase.from(TICKETS_TABLE).update({ is_active: false }).eq("id", id);
    if (soft?.error) {
      const hard = await supabase.from(TICKETS_TABLE).delete().eq("id", id);
      if (hard?.error) return;
    }

    if (editing?.id === id) closeEditor();
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
              const active = p.isActive ?? p.is_active ?? true;
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
                    <span className="adminTicketStrong">{formatMoney(p.priceCents ?? p.price_cents ?? 0, currency)}</span>
                    <span>•</span>
                    <span>Stock : {p.stockQty ?? p.stock_qty ?? "∞"}</span>
                    <span>•</span>
                    <span>Ordre : {p.sortOrder ?? p.sort_order ?? 0}</span>
                  </div>

                  <div className="adminTicketMeta">
                    <span>Participants : {p.createsAttendees ?? p.creates_attendees ? "Oui" : "Non"}</span>
                    <span>•</span>
                    <span>/ billet : {p.attendeesPerUnit ?? p.attendees_per_unit ?? 0}</span>
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
                    <button type="button" className="adminTicketBtn" onClick={() => openEdit(p)}>
                      Éditer
                    </button>
                    <button type="button" className="adminTicketBtn danger" onClick={() => remove(p)}>
                      Supprimer
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
                  <div className="adminTicketsEditorTitle">{creating ? "Nouveau ticket" : "Éditer ticket"}</div>
                  <div className="adminEventHint">Les prix sont en centimes.</div>
                </div>

                <button type="button" className="adminTicketBtn" onClick={closeEditor}>
                  Fermer
                </button>
              </div>

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
                  <select
                    className="adminEventInput"
                    value={editing.currency}
                    onChange={(e) => setEditing({ ...editing, currency: e.target.value })}
                  >
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
                      setEditing({ ...editing, stockQty: e.target.value === "" ? null : clampInt(e.target.value, 0) })
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
                  onClick={save}
                  disabled={!String(editing.name ?? "").trim()}
                >
                  Enregistrer
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
