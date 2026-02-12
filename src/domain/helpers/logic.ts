import type { EventProductUI } from "../models/admin/admin.eventProductUI.schema";

export function clampQty(nextQty: number, maxQty: number) {
  const n = Number(nextQty);
  if (!Number.isFinite(n)) return 0;
  const q = Math.floor(n);
  if (q < 0) return 0;
  if (q > maxQty) return maxQty;
  return q;
}

export function computeRemaining(p: EventProductUI) {
  if (p.stockQty == null) return null;
  const remaining = Math.max(0, (p.stockQty ?? 0) - (p.soldQty ?? 0) - (p.reservedQty ?? 0));
  return remaining;
}

export function sortProducts(products: EventProductUI[]) {
  return [...(products ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export type QuantityMap = Record<string, unknown>;

export function quantitiesToItems(quantities: QuantityMap) {
  return Object.entries(quantities ?? {})
    .map(([eventProductId, quantity]) => ({
      eventProductId,
      quantity: Number(quantity) || 0,
    }))
    .filter((x) => x.quantity > 0);
}

export function sumItemQuantities(items: { quantity: number }[]) {
  return items.reduce((acc, it) => acc + it.quantity, 0);
}

export function computeTotalCents(
  items: { eventProductId: string; quantity: number }[],
  products: { id: string; priceCents: number }[]
) {
  const productMap = new Map(
    products.map((p) => [p.id, p.priceCents ?? 0])
  );

  return items.reduce((acc, it) => {
    const price = productMap.get(it.eventProductId) ?? 0;
    return acc + it.quantity * price;
  }, 0);
}

export function resolveCurrency(
  products: { currency?: string }[],
  fallback = "EUR"
) {
  return products.find(p => p.currency)?.currency ?? fallback;
}

export function computeExpectedAttendeeSlots(
  products: {
    id: string;
    createsAttendees?: boolean;
    attendeesPerUnit?: number;
  }[],
  quantities: Record<string, unknown>
) {
  const slots: Array<{ eventProductId: string }> = [];

  for (const p of products) {
    if (!p.createsAttendees) continue;

    const qty = Number(quantities[p.id] ?? 0) || 0;
    const perUnit = Number(p.attendeesPerUnit ?? 0) || 0;
    const count = qty * perUnit;

    for (let i = 0; i < count; i++) {
      slots.push({ eventProductId: p.id });
    }
  }

  return slots;
}

export const DEFAULT_MAX_QTY = 99;

export type ExpectedSlot = { eventProductId: string };

export type AttendeeDraft = {
  eventProductId: string;
  values: Record<string, unknown>;
};

export function reconcileAttendeesByIndex(
  prev: AttendeeDraft[],
  expectedSlots: ExpectedSlot[]
): AttendeeDraft[] {
  return expectedSlots.map((slot, idx) => {
    const old = prev[idx];
    if (old && old.eventProductId === slot.eventProductId) return old;
    return { eventProductId: slot.eventProductId, values: {} };
  });
}

export function getMaxQty(remaining: number | null | undefined) {
  return remaining == null ? DEFAULT_MAX_QTY : Math.max(0, remaining);
}

export function resolveMaxQty(remaining: number | null | undefined) {
  return remaining == null ? DEFAULT_MAX_QTY : Math.max(0, remaining);
}

export function computeNextQty(nextQty: number, remaining: number | null | undefined) {
  const maxQty = resolveMaxQty(remaining);
  return clampQty(nextQty, maxQty);
}