import { useMemo } from "react";
import { normalizeText } from "@helpers/normalize";
import { isFilled } from "@helpers/fields";
import type { Attendee } from "@shared/models/db/db.attendee.schema";
import type { AttendeeAnswers } from "@shared/models/db/db.attendeeAnswers.schema";
import type { EventDetailAdmin } from "../../singleEvent/schemas/admin.eventDetail.schema";

export type FilterMode = "all" | "order" | `field:${string}`;

type OrderRow = EventDetailAdmin["orders"]["rows"][number]; // ✅ row type “source of truth”

type OrderMeta = { orderNumber: string; createdAt?: string };
type FilledField = { key: string; label: string; value: string };

export function useParticipantsViewModel(params: {
  localAttendees: Attendee[];
  localAnswers: AttendeeAnswers[];
  localOrders: OrderRow[]; // ✅ plus de Record

  query: string;
  filterMode: FilterMode;
}) {
  const { localAttendees, localAnswers, localOrders, query, filterMode } = params;

  /* -------------------- ORDER META -------------------- */
  const orderMetaById = useMemo(() => {
    const m = new Map<string, OrderMeta>();

    for (const o of localOrders) {
      const id = o.id;
      m.set(id, {
        orderNumber: (o.id.slice(0, 8)) as string,
        createdAt: o.createdAt,
      });
    }

    return m;
  }, [localOrders]);

  /* -------------------- ANSWERS BY ATTENDEE (FILLED) -------------------- */
  const filledFieldsByAttendeeId = useMemo(() => {
    const map = new Map<string, FilledField[]>();

    for (const a of localAnswers) {
      if (!isFilled(a.value)) continue;

      const arr = map.get(a.attendeeId) ?? [];
      arr.push({
        key: a.fieldKeySnapshot,
        label: a.fieldLabelSnapshot,
        value: String(a.value),
      });
      map.set(a.attendeeId, arr);
    }

    for (const [id, arr] of map.entries()) {
      const uniq = new Map<string, FilledField>();
      for (const f of arr) uniq.set(f.key, f);

      const list = Array.from(uniq.values());
      list.sort((x, y) => x.label.localeCompare(y.label));
      map.set(id, list);
    }

    return map;
  }, [localAnswers]);

  /* -------------------- FIELDS OPTIONS -------------------- */
  const fieldOptions = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of localAnswers) {
      const key = a.fieldKeySnapshot;
      const label = a.fieldLabelSnapshot || key;
      if (!key) continue;
      if (!m.has(key)) m.set(key, label);
    }
    const arr = Array.from(m.entries()).map(([key, label]) => ({ key, label }));
    arr.sort((x, y) => x.label.localeCompare(y.label));
    return arr;
  }, [localAnswers]);

  /* -------------------- IDENTITY -------------------- */
  const computeIdentity = useMemo(() => {
    return (attendeeId: string) => {
      const fields = filledFieldsByAttendeeId.get(attendeeId) ?? [];
      const getVal = (...keys: string[]) => fields.find((f) => keys.includes(f.key))?.value ?? "";

      const full = `${getVal("firstName", "prenom", "first_name")} ${getVal("lastName", "nom", "last_name")}`.trim();
      const email = getVal("email");

      return {
        title: full || email || "Participant",
        subtitle: full && email ? email : "",
      };
    };
  }, [filledFieldsByAttendeeId]);

  /* -------------------- FILTERED ATTENDEES -------------------- */
  const filteredAttendees = useMemo(() => {
    const q = normalizeText(query);
    if (!q) return localAttendees;

    const mode = filterMode;

    const matchOrder = (orderId: string) => {
      const orderNum = orderMetaById.get(orderId)?.orderNumber ?? "";
      return normalizeText(orderNum).includes(q);
    };

    const matchAnyField = (attendeeId: string) => {
      const fields = filledFieldsByAttendeeId.get(attendeeId) ?? [];
      return fields.some((f) => normalizeText(f.value).includes(q));
    };

    const matchFieldKey = (attendeeId: string, key: string) => {
      const fields = filledFieldsByAttendeeId.get(attendeeId) ?? [];
      const found = fields.find((f) => f.key === key);
      return found ? normalizeText(found.value).includes(q) : false;
    };

    return localAttendees.filter((att) => {
      if (mode === "order") return matchOrder(att.orderId);

      if (mode.startsWith("field:")) {
        const key = mode.slice("field:".length);
        return key ? matchFieldKey(att.id, key) : false;
      }

      return matchOrder(att.orderId) || matchAnyField(att.id);
    });
  }, [localAttendees, query, filterMode, orderMetaById, filledFieldsByAttendeeId]);

  /* -------------------- GROUPS BY ORDER -------------------- */
  const groups = useMemo(() => {
    const byOrder = new Map<string, Attendee[]>();
    for (const a of filteredAttendees) {
      const arr = byOrder.get(a.orderId) ?? [];
      arr.push(a);
      byOrder.set(a.orderId, arr);
    }

    const q = normalizeText(query);
    const mode = filterMode;

    const orderMatchesQuery = (orderId: string) => {
      const orderNum = orderMetaById.get(orderId)?.orderNumber ?? "";
      return normalizeText(orderNum).includes(q);
    };

    const shouldShowOrder = (orderId: string) => {
      if (!q) return true;
      if (mode === "order") return orderMatchesQuery(orderId);
      if (mode.startsWith("field:")) return (byOrder.get(orderId) ?? []).length > 0;
      return orderMatchesQuery(orderId) || (byOrder.get(orderId) ?? []).length > 0;
    };

    const visibleOrders = localOrders
      .map((o) => ({ orderId: o.id, createdAt: o.createdAt ?? "" }))
      .filter((x) => x.orderId)
      .filter((x) => shouldShowOrder(x.orderId));

    visibleOrders.sort((a, b) => {
      if (b.createdAt !== a.createdAt) return b.createdAt.localeCompare(a.createdAt);
      return b.orderId.localeCompare(a.orderId);
    });

    const out: Array<[string, Attendee[]]> = [];
    for (const o of visibleOrders) {
      const arr = byOrder.get(o.orderId) ?? [];
      arr.sort((x, y) => (x.attendeeIndex ?? 0) - (y.attendeeIndex ?? 0));
      out.push([o.orderId, arr]);
    }

    return out;
  }, [filteredAttendees, localOrders, orderMetaById, query, filterMode]);

  return {
    orderMetaById,
    filledFieldsByAttendeeId,
    fieldOptions,
    filteredAttendees,
    groups,
    computeIdentity,
  };
}
