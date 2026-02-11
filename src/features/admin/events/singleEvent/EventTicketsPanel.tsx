import { useEffect, useMemo, useRef, useState } from "react";

import type { EventProducts } from "../../../../domain/models/db/db.eventProducts.schema";
import type { CreateEventProductInput } from "../../../../domain/models/admin/admin.createEventProduct.schema";
import type { UpdateEventProductPatch } from "../../../../gateways/supabase/repositories/dashboard/updateEventProductRepo";

import { Button, EditorShell } from "../../../../ui/components";

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

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false
  );

  useEffect(() => {
    const m = window.matchMedia(query);
    const onChange = () => setMatches(m.matches);
    onChange();
    m.addEventListener?.("change", onChange);
    return () => m.removeEventListener?.("change", onChange);
  }, [query]);

  return matches;
}

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

function makeClientId() {
  return `tmp_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function normalizeContiguousSortOrder<T extends { sortOrder: number }>(list: T[]) {
  return list.map((x, idx) => ({ ...x, sortOrder: idx + 1 }));
}

type TicketDraft = {
  id: string | null;
  clientId: string;

  name: string;
  description: string;
  priceCents: number;
  currency: "EUR";
  stockQty: number | null;
  sortOrder: number;
  createsAttendees: boolean;
  attendeesPerUnit: number;
  isActive: boolean;
  isGatekeeper: boolean;
  closeEventWhenSoldOut: boolean;

  isNew?: boolean;
};

type EditState = {
  id: string | null; // clientId
  name: string;
  description: string;
  priceCents: number;
  currency: "EUR";
  stockQty: number | null;
  sortOrder: number;
  createsAttendees: boolean;
  attendeesPerUnit: number;
  isActive: boolean;
  isGatekeeper: boolean;
  closeEventWhenSoldOut: boolean;
};

type MoveFx = {
  aId: string;
  bId: string;
  dir: -1 | 1;
  nonce: number;
} | null;

export function EventTicketsPanel(props: Props) {
  const {
    event,
    products,
    onCreate,
    onUpdate,
    onRemove,
    onChanged,
    createLoading = false,
    updateLoading = false,
    deleteLoading = false,
  } = props;

  const isMobile = useMediaQuery("(max-width: 1050px)");

  const [draft, setDraft] = useState<TicketDraft[]>([]);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  const [editing, setEditing] = useState<EditState | null>(null);
  const [creating, setCreating] = useState(false);

  const [isDirty, setIsDirty] = useState(false);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [saveAllError, setSaveAllError] = useState<string | null>(null);

  const lastLoadedSigRef = useRef<string>("");
  const moveFxTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const [moveFx, setMoveFx] = useState<MoveFx>(null);

  // fermeture animée inline
  const [closingKey, setClosingKey] = useState<string | null>(null); // "create" ou clientId
  const [isClosing, setIsClosing] = useState(false);

  const isSaving = isSavingAll || createLoading || updateLoading || deleteLoading;

  function productToDraft(p: any): TicketDraft {
    return {
      id: String(p?.id ?? null),
      clientId: String(p?.id ?? makeClientId()),
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

  const incomingSig = useMemo(() => {
    const arr = Array.isArray(products) ? [...products] : [];
    arr.sort((a, b) => clampInt(a?.sortOrder ?? 0, 0) - clampInt(b?.sortOrder ?? 0, 0));
    return arr
      .map((p) => `${String(p?.id)}:${String(p?.updatedAt ?? "")}:${clampInt(p?.sortOrder ?? 0, 0)}`)
      .join("|");
  }, [products]);

  useEffect(() => {
    if (isDirty) return;
    if (lastLoadedSigRef.current === incomingSig) return;

    const arr = Array.isArray(products) ? [...products] : [];
    arr.sort((a, b) => clampInt(a?.sortOrder ?? 0, 0) - clampInt(b?.sortOrder ?? 0, 0));

    const next = normalizeContiguousSortOrder(arr.map(productToDraft));
    setDraft(next);
    setDeletedIds(new Set());
    setSaveAllError(null);
    lastLoadedSigRef.current = incomingSig;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingSig, isDirty]);

  useEffect(() => {
    return () => {
      if (moveFxTimerRef.current) window.clearTimeout(moveFxTimerRef.current);
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  function armMoveFx(next: MoveFx) {
    setMoveFx(next);
    if (moveFxTimerRef.current) window.clearTimeout(moveFxTimerRef.current);
    moveFxTimerRef.current = window.setTimeout(() => setMoveFx(null), 240);
  }

  function markDirty() {
    setIsDirty(true);
    setSaveAllError(null);
  }

  function cancelClosingIfAny() {
    setIsClosing(false);
    setClosingKey(null);
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
  }

  function openCreate() {
    cancelClosingIfAny();
    setSaveAllError(null);
    setCreating(true);
    setEditing({
      id: null,
      name: "",
      description: "",
      priceCents: 0,
      currency: "EUR",
      stockQty: null,
      sortOrder: (draft.at(-1)?.sortOrder ?? 0) + 1,
      createsAttendees: true,
      attendeesPerUnit: 1,
      isActive: true,
      isGatekeeper: false,
      closeEventWhenSoldOut: false,
    });
  }

  function openEdit(f: TicketDraft) {
    cancelClosingIfAny();
    setSaveAllError(null);
    setCreating(false);
    setEditing({
      id: f.clientId,
      name: f.name,
      description: f.description,
      priceCents: f.priceCents,
      currency: "EUR",
      stockQty: f.stockQty,
      sortOrder: f.sortOrder,
      createsAttendees: f.createsAttendees,
      attendeesPerUnit: f.attendeesPerUnit,
      isActive: f.isActive,
      isGatekeeper: f.isGatekeeper,
      closeEventWhenSoldOut: f.closeEventWhenSoldOut,
    });
  }

  function closeEditor() {
    if (!editing) {
      setCreating(false);
      return;
    }

    const key = creating ? "create" : (editing.id ?? null);
    if (!key) {
      setEditing(null);
      setCreating(false);
      return;
    }

    setIsClosing(true);
    setClosingKey(key);

    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => {
      setEditing(null);
      setCreating(false);
      setIsClosing(false);
      setClosingKey(null);
    }, 180);
  }

  function moveLocal(clientId: string, dir: -1 | 1) {
    setDraft((prev) => {
      const idx = prev.findIndex((x) => x.clientId === clientId);
      if (idx < 0) return prev;

      const nextIdx = idx + dir;
      if (nextIdx < 0 || nextIdx >= prev.length) return prev;

      const a = prev[idx];
      const b = prev[nextIdx];
      armMoveFx({ aId: a.clientId, bId: b.clientId, dir, nonce: Date.now() });

      const copy = [...prev];
      const tmp = copy[idx];
      copy[idx] = copy[nextIdx];
      copy[nextIdx] = tmp;

      return normalizeContiguousSortOrder(copy);
    });
    markDirty();
  }

  function toggleLocal(clientId: string, patch: Partial<Pick<TicketDraft, "isActive">>) {
    setDraft((prev) => prev.map((t) => (t.clientId === clientId ? { ...t, ...patch } : t)));
    markDirty();
  }

  function removeLocal(clientId: string) {
    const ok = window.confirm("Supprimer ce ticket ? (les commandes passées restent intactes)");
    if (!ok) return;

    setDraft((prev) => {
      const found = prev.find((x) => x.clientId === clientId);
      if (!found) return prev;

      if (found.id && onRemove) {
        setDeletedIds((s) => {
          const ns = new Set(s);
          ns.add(found.id!);
          return ns;
        });
      }

      const next = prev.filter((x) => x.clientId !== clientId);
      return normalizeContiguousSortOrder(next);
    });

    if (editing?.id === clientId) closeEditor();
    markDirty();
  }

  function upsertLocalFromEditor() {
    if (!editing) return;
    const name = String(editing.name ?? "").trim();
    if (!name) return;

    if (creating) {
      const clientId = makeClientId();
      const next: TicketDraft = {
        id: null,
        clientId,
        name,
        description: String(editing.description ?? ""),
        priceCents: clampInt(editing.priceCents, 0),
        currency: "EUR",
        stockQty: editing.stockQty == null ? null : clampInt(editing.stockQty, 0),
        sortOrder: draft.length + 1,
        createsAttendees: Boolean(editing.createsAttendees),
        attendeesPerUnit: clampInt(editing.attendeesPerUnit, 1) || 1,
        isActive: Boolean(editing.isActive),
        isGatekeeper: Boolean(editing.isGatekeeper),
        closeEventWhenSoldOut: Boolean(editing.closeEventWhenSoldOut),
        isNew: true,
      };

      setDraft((prev) => normalizeContiguousSortOrder([...prev, next]));
      markDirty();
      closeEditor();
      return;
    }

    const clientId = editing.id;
    if (!clientId) return;

    setDraft((prev) =>
      prev.map((t) =>
        t.clientId === clientId
          ? {
              ...t,
              name,
              description: String(editing.description ?? ""),
              priceCents: clampInt(editing.priceCents, 0),
              stockQty: editing.stockQty == null ? null : clampInt(editing.stockQty, 0),
              createsAttendees: Boolean(editing.createsAttendees),
              attendeesPerUnit: clampInt(editing.attendeesPerUnit, 1) || 1,
              isActive: Boolean(editing.isActive),
              isGatekeeper: Boolean(editing.isGatekeeper),
              closeEventWhenSoldOut: Boolean(editing.closeEventWhenSoldOut),
            }
          : t
      )
    );

    markDirty();
    closeEditor();
  }

  function resetLocalChanges() {
    setIsDirty(false);
    setSaveAllError(null);
    lastLoadedSigRef.current = "";
  }

  async function saveAll() {
    if (!event?.id) return;
    if (isSaving) return;

    setIsSavingAll(true);
    setSaveAllError(null);

    try {
      if (onRemove) {
        const toDelete = Array.from(deletedIds);
        for (const id of toDelete) {
          await onRemove(id);
        }
      }

      const normalized = normalizeContiguousSortOrder(draft);

      for (const t of normalized) {
        const base: CreateEventProductInput = {
          eventId: event.id,
          name: String(t.name ?? "").trim(),
          description: toNullIfEmpty(String(t.description ?? "")),
          priceCents: clampInt(t.priceCents, 0),
          currency: "EUR",
          stockQty: t.stockQty == null ? null : clampInt(t.stockQty, 0),
          sortOrder: clampInt(t.sortOrder, 0),
          createsAttendees: Boolean(t.createsAttendees),
          attendeesPerUnit: clampInt(t.attendeesPerUnit, 1) || 1,
          isActive: Boolean(t.isActive),
          isGatekeeper: Boolean(t.isGatekeeper),
          closeEventWhenSoldOut: Boolean(t.closeEventWhenSoldOut),
        };

        if (!t.id) {
          await onCreate(base);
          continue;
        }

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

        await onUpdate({ productId: t.id, patch });
      }

      setIsDirty(false);
      setDeletedIds(new Set());
      onChanged?.();
    } catch (e: any) {
      setSaveAllError(e?.message ? String(e.message) : "Erreur inconnue");
    } finally {
      setIsSavingAll(false);
    }
  }

  const isOpen = Boolean(editing);
  const editingId = editing?.id ?? null;

  const sorted = useMemo(() => {
    const arr = [...draft];
    arr.sort((a, b) => clampInt(a.sortOrder, 0) - clampInt(b.sortOrder, 0));
    return arr;
  }, [draft]);

  function getSoldQty(p: any) {
    return clampInt(p?.soldQty ?? p?.sold_qty ?? 0, 0);
  }

  function formatStockLine(sold: number, stockQty: number | null | undefined) {
    if (stockQty == null) return `${sold} vendus / illimité`;
    const stock = clampInt(stockQty, 0);
    return `${stock - sold} / ${stock}`;
  }

  const editorNode = editing ? (
    <div className="adminTicketsEditorCard">
      <div className="adminTicketsEditorHeader adminTicketsEditorHeaderInline">
        <div>
          <div className="adminTicketsEditorTitle">{creating ? "Nouveau ticket" : "Modifier ticket"}</div>
          <div className="adminEventHint">Les prix sont en centimes.</div>
        </div>
      </div>

      <div className="adminEventFormGrid adminTicketsEditorFormGrid">
        <div className="adminEventField">
          <div className="adminEventLabel">Nom</div>
          <input
            className="adminEventInput"
            value={editing.name}
            onChange={(e) => setEditing({ ...editing, name: e.target.value })}
            disabled={isSaving}
          />
        </div>

        <div className="adminEventField">
          <div className="adminEventLabel">Ordre</div>
          <input
            className="adminEventInput"
            type="number"
            value={editing.sortOrder}
            onChange={(e) => setEditing({ ...editing, sortOrder: clampInt(e.target.value, 0) })}
            disabled={isSaving}
          />
        </div>

        <div className="adminEventField">
          <div className="adminEventLabel">Prix (centimes)</div>
          <input
            className="adminEventInput"
            type="number"
            value={editing.priceCents}
            onChange={(e) => setEditing({ ...editing, priceCents: clampInt(e.target.value, 0) })}
            disabled={isSaving}
          />
        </div>

        <div className="adminEventField">
          <div className="adminEventLabel">Devise</div>
          <select className="adminEventInput" value={editing.currency} disabled>
            <option value="EUR">EUR</option>
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
            disabled={isSaving}
          />
        </div>

        <div className="adminEventField">
          <div className="adminEventLabel">Actif</div>
          <label className="adminEventToggle">
            <input
              type="checkbox"
              checked={Boolean(editing.isActive)}
              onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })}
              disabled={isSaving}
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
              disabled={isSaving}
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
            disabled={!editing.createsAttendees || isSaving}
          />
        </div>

        <div className="adminEventField adminEventFieldSpan2">
          <div className="adminEventLabel">Description</div>
          <textarea
            className="adminEventTextarea"
            value={editing.description}
            onChange={(e) => setEditing({ ...editing, description: e.target.value })}
            disabled={isSaving}
          />
        </div>
      </div>

      <div className="adminTicketsEditorFooter adminTicketsEditorFooterInline">
        <Button onClick={upsertLocalFromEditor} disabled={!String(editing.name ?? "").trim() || isSaving}>
          {creating ? "Ajouter (local)" : "Appliquer (local)"}
        </Button>

        <Button variant="secondary" onClick={closeEditor} disabled={isSaving}>
          Fermer
        </Button>
      </div>
    </div>
  ) : null;

  function renderTicketCard(t: TicketDraft, idx: number) {
    const active = Boolean(t.isActive ?? true);

    const p = t.id
      ? Array.isArray(products)
        ? (products as any[]).find((x: any) => String(x?.id) === String(t.id))
        : null
      : null;

    const currency = "EUR";
    const sold = getSoldQty(p);
    const stockLine = formatStockLine(sold, (p as any)?.stockQty ?? t.stockQty);

    const isFxA = moveFx?.aId === t.clientId;
    const isFxB = moveFx?.bId === t.clientId;
    const fxClass =
      moveFx && isFxA
        ? moveFx.dir === -1
          ? "isMoveUp"
          : "isMoveDown"
        : moveFx && isFxB
          ? moveFx.dir === -1
            ? "isMoveDown"
            : "isMoveUp"
          : "";

    return (
      <div
        key={t.clientId}
        className={[
          active ? "adminTicketCard" : "adminTicketCard isInactive",
          "adminReorderCard",
          fxClass,
        ].join(" ")}
        data-movefx={moveFx?.nonce ?? ""}
      >
        <div className="adminTicketTop">
          <div className="adminTicketTitle">{t.name || "—"}</div>
          <div className={active ? "adminTicketPill" : "adminTicketPill isOff"}>
            {active ? "Actif" : "Inactif"}
          </div>
        </div>

        <div className="adminTicketMeta">
          <span className="adminTicketStrong">{formatMoney(t.priceCents ?? 0, currency)}</span>
          <span>•</span>
          <span>Stock : {stockLine}</span>
        </div>

        <div className="adminTicketMeta">
          {t.createsAttendees ? (
            <span>
              Ce billet crée <strong>{t.attendeesPerUnit ?? 1}</strong> participant
              {(t.attendeesPerUnit ?? 1) > 1 ? "s" : ""} qui devra
              {(t.attendeesPerUnit ?? 1) > 1 ? "ont" : ""} remplir le formulaire
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

        {t.description ? <div className="adminTicketDesc">{t.description}</div> : null}

        <div className="adminTicketActions">
          <Button variant="secondary" onClick={() => openEdit(t)} disabled={isSaving}>
            Modifier
          </Button>

          <Button
            variant="secondary"
            onClick={() => toggleLocal(t.clientId, { isActive: !active })}
            disabled={isSaving}
          >
            {active ? "Désactiver" : "Activer"}
          </Button>

          <Button
            className={[
              "adminReorderBtn",
              isFxA && moveFx?.dir === -1 ? "isBumpUp" : "",
            ].join(" ")}
            onClick={() => moveLocal(t.clientId, -1)}
            disabled={isSaving || idx === 0}
          >
            ↑
          </Button>

          <Button
            className={[
              "adminReorderBtn",
              isFxA && moveFx?.dir === 1 ? "isBumpDown" : "",
            ].join(" ")}
            onClick={() => moveLocal(t.clientId, 1)}
            disabled={isSaving || idx === sorted.length - 1}
          >
            ↓
          </Button>

          <Button
            variant="danger"
            onClick={() => removeLocal(t.clientId)}
            disabled={isSaving || (!onRemove && Boolean(t.id))}
          >
            Supprimer
          </Button>
        </div>
      </div>
    );
  }

  const showCreateInline = (isOpen && creating) || (isClosing && closingKey === "create");

  return (
    <div className="adminTickets">
      <div className="adminEventHeaderRow">
        <div>
          <h3 className="adminTicketsTitle">Tickets</h3>
          <div className="adminEventHint">
            Créez, modifiez, réordonnez, désactivez… puis “Sauvegarder”.
            {isDirty ? <span className="adminTicketsDirtyDot">• Modifications non sauvegardées</span> : null}
          </div>
        </div>

        <div className="adminEventHeaderActions">
          <Button onClick={openCreate} disabled={!event?.id || isSaving}>
            Nouveau ticket
          </Button>

          <Button onClick={saveAll} disabled={!event?.id || !isDirty || isSaving}>
            {isSavingAll ? "Sauvegarde…" : "Sauvegarder"}
          </Button>

          {isDirty ? (
            <Button onClick={resetLocalChanges} disabled={isSaving}>
              Annuler
            </Button>
          ) : null}
        </div>
      </div>

      {saveAllError ? <div className="adminTicketsSaveError">{saveAllError}</div> : null}

      {/* ---------------- Mobile : editor inline ---------------- */}
      {isMobile ? (
        <div className={isOpen || isClosing ? "adminTicketsInlineShell isEditorOpen" : "adminTicketsInlineShell"}>
          {/* Nouveau ticket: editor tout en haut */}
          {showCreateInline ? (
            <div
              className={[
                "adminTicketsInlineEditor",
                "isCreate",
                isClosing && closingKey === "create" ? "isClosing" : "isOpen",
              ].join(" ")}
            >
              {editorNode}
            </div>
          ) : null}

          <div className="adminTicketsList">
            {sorted.length === 0 ? (
              <div className="adminEventEmpty">Aucun ticket. Clique sur “Nouveau ticket”.</div>
            ) : (
              sorted.map((t, idx) => {
                const showEditInline =
                  ((isOpen && !creating && editingId === t.clientId) || (isClosing && closingKey === t.clientId));

                return (
                  <div key={t.clientId} className="adminTicketBlock">
                    {renderTicketCard(t, idx)}

                    {/* Modifier: editor juste sous le ticket sélectionné */}
                    {showEditInline ? (
                      <div
                        className={[
                          "adminTicketsInlineEditor",
                          "isEdit",
                          isClosing && closingKey === t.clientId ? "isClosing" : "isOpen",
                        ].join(" ")}
                      >
                        {editorNode}
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* ---------------- Desktop : EditorShell (à droite) ---------------- */
        <EditorShell
          isOpen={isOpen}
          onRequestClose={closeEditor}
          editorWidth={420}
          editorGap={14}
          stickyTop={84}
          left={
            <div className="adminTicketsList">
              {sorted.length === 0 ? (
                <div className="adminEventEmpty">Aucun ticket. Clique sur “Nouveau ticket”.</div>
              ) : (
                sorted.map((t, idx) => renderTicketCard(t, idx))
              )}
            </div>
          }
          right={isOpen ? editorNode : null}
        />
      )}
    </div>
  );
}
