import { useEffect, useMemo, useRef, useState } from "react";

import type { EventProduct, EventProducts } from "@shared/models/db/db.eventProducts.schema";
import type { CreateEventProductInput } from "../../products/schemas/admin.createEventProduct.schema";
import type { UpdateEventProductPatch } from "@app/modules/admin/products/data/updateEventProductRepo";

import { normalizeContiguousSortOrder } from "@helpers/normalize";
import { makeClientId, nonNegInt, posInt, sortBySortOrder } from "@helpers/logic";
import { toNullIfEmpty } from "@helpers/fields";

export type TicketDraft = {
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

type MoveFx =
  | {
      aId: string;
      bId: string;
      dir: -1 | 1;
      nonce: number;
    }
  | null;

type Params = {
  eventId: string | null;
  products: EventProducts;

  onCreate: (input: CreateEventProductInput) => Promise<void>;
  onUpdate: (input: { productId: string; patch: UpdateEventProductPatch }) => Promise<void>;
  onRemove?: (productId: string) => Promise<void>;
  onChanged?: () => void;

  createLoading?: boolean;
  updateLoading?: boolean;
  deleteLoading?: boolean;
};

export function useEventTicketsEditor({
  eventId,
  products,
  onCreate,
  onUpdate,
  onRemove,
  onChanged,
  createLoading = false,
  updateLoading = false,
  deleteLoading = false,
}: Params) {
  const [draft, setDraft] = useState<TicketDraft[]>([]);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  const [editing, setEditing] = useState<EditState | null>(null);
  const [creating, setCreating] = useState(false);

  const [isDirty, setIsDirty] = useState(false);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [saveAllError, setSaveAllError] = useState<string | null>(null);

  const [moveFx, setMoveFx] = useState<MoveFx>(null);
  const moveFxTimerRef = useRef<number | null>(null);

  const [closingKey, setClosingKey] = useState<string | null>(null); // "create" ou clientId
  const [isClosing, setIsClosing] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

  const [query, setQuery] = useState("");

  const lastLoadedSigRef = useRef<string>("");

  const isSaving = isSavingAll || createLoading || updateLoading || deleteLoading;
  const isFiltering = query.trim().length > 0;

  function productToDraft(p: EventProduct): TicketDraft {
    return {
      id: String(p?.id ?? null),
      clientId: String(p?.id ?? makeClientId()),
      name: String(p?.name ?? ""),
      description: String(p?.description ?? ""),
      priceCents: nonNegInt(p?.priceCents),
      currency: "EUR",
      stockQty: p?.stockQty == null ? null : nonNegInt(p.stockQty),
      sortOrder: nonNegInt(p?.sortOrder),
      createsAttendees: Boolean(p?.createsAttendees ?? true),
      attendeesPerUnit: posInt(p?.attendeesPerUnit),
      isActive: Boolean(p?.isActive ?? true),
      isGatekeeper: Boolean(p?.isGatekeeper ?? false),
      closeEventWhenSoldOut: Boolean(p?.closeEventWhenSoldOut ?? false),
    };
  }

  const incomingSig = useMemo(() => {
    const arr = sortBySortOrder(Array.isArray(products) ? products : []);
    return arr
      .map((p) => `${String(p?.id)}:${String(p?.updatedAt ?? "")}:${nonNegInt(p?.sortOrder)}`)
      .join("|");
  }, [products]);

  useEffect(() => {
    if (isDirty) return;
    if (lastLoadedSigRef.current === incomingSig) return;

    const arr = sortBySortOrder(Array.isArray(products) ? products : []);
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
      [copy[idx], copy[nextIdx]] = [copy[nextIdx], copy[idx]];

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
        priceCents: nonNegInt(editing.priceCents),
        currency: "EUR",
        stockQty: editing.stockQty == null ? null : nonNegInt(editing.stockQty),
        sortOrder: draft.length + 1,
        createsAttendees: Boolean(editing.createsAttendees),
        attendeesPerUnit: posInt(editing.attendeesPerUnit),
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
              priceCents: nonNegInt(editing.priceCents),
              stockQty: editing.stockQty == null ? null : nonNegInt(editing.stockQty),
              createsAttendees: Boolean(editing.createsAttendees),
              attendeesPerUnit: posInt(editing.attendeesPerUnit),
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
    if (!eventId) return;
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
          eventId,
          name: String(t.name ?? "").trim(),
          description: toNullIfEmpty(String(t.description ?? "")),
          priceCents: nonNegInt(t.priceCents),
          currency: "EUR",
          stockQty: t.stockQty == null ? null : nonNegInt(t.stockQty),
          sortOrder: nonNegInt(t.sortOrder),
          createsAttendees: Boolean(t.createsAttendees),
          attendeesPerUnit: posInt(t.attendeesPerUnit),
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

  const sorted = useMemo(() => sortBySortOrder(draft), [draft]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;

    return sorted.filter((t) => {
      const name = String(t.name ?? "").toLowerCase();
      const desc = String(t.description ?? "").toLowerCase();
      return name.includes(q) || desc.includes(q);
    });
  }, [sorted, query]);

  function getSoldQty(p: EventProduct | null | undefined) {
    return nonNegInt(p?.soldQty);
  }

  function formatStockLine(sold: number, stockQty: number | null | undefined) {
    if (stockQty == null) return `${sold} vendus / illimité`;
    const stock = nonNegInt(stockQty);
    const remaining = Math.max(0, stock - sold);
    return `${remaining} / ${stock}`;
  }

  return {
    // state
    draft,
    deletedIds,
    editing,
    creating,
    isDirty,
    isSaving,
    isSavingAll,
    saveAllError,
    moveFx,
    query,
    isFiltering,
    closingKey,
    isClosing,

    // derived
    sorted,
    filtered,

    // setters
    setEditing,
    setQuery,

    // actions
    openCreate,
    openEdit,
    closeEditor,
    moveLocal,
    toggleLocal,
    removeLocal,
    upsertLocalFromEditor,
    resetLocalChanges,
    saveAll,

    // helpers
    getSoldQty,
    formatStockLine,
  };
}