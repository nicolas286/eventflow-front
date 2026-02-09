import { useEffect, useMemo, useState } from "react";
import Button from "../../../../ui/components/button/Button";
import { supabase } from "../../../../gateways/supabase/supabaseClient";

import { AttendeeEditorPanel, type RegistrationFieldLike } from "../../../../features/admin/events/singleEvent/AttendeeEditorPanel";
import { useAdminUpdateOrderAttendee } from "../../../../features/admin/hooks/useUpdateOrderAttendeeAnswers";

type AnyRecord = Record<string, any>;

type Attendee = {
  id: string;
  orderId: string;
  productId?: string | null;
  productNameSnapshot: string;
  attendeeIndex: number;
  createdAt: string;
  status: "reserved" | "confirmed" | "cancelled" | "expired";
  confirmedAt?: string | null;
  expiresAt?: string | null;
  detailsCompletedAt?: string | null;
  canceledAt?: string | null;
};

type AttendeeAnswer = {
  id: string;
  attendeeId: string;
  fieldKeySnapshot: string;
  fieldTypeSnapshot:
    | "text"
    | "textarea"
    | "email"
    | "number"
    | "select"
    | "checkbox"
    | "radio"
    | "date"
    | "country"
    | "phone";
  fieldLabelSnapshot: string;
  value?: string | null;
  createdAt: string;
  updatedAt: string;
};

function toRows<T = AnyRecord>(value: any): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && Array.isArray(value.rows)) return value.rows as T[];
  return [];
}

function getFirst<T = any>(obj: AnyRecord | null | undefined, keys: string[]): T | undefined {
  if (!obj) return undefined;
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null) return v as T;
  }
  return undefined;
}

function normalizeStr(v: any): string {
  if (v === null || v === undefined) return "—";
  const s = String(v).trim();
  return s.length ? s : "—";
}

function isFilled(value: any): boolean {
  if (value === null || value === undefined) return false;
  return String(value).trim().length > 0;
}

function normalizeSearch(v: any): string {
  return String(v ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

function formatDateTime(value: any): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  try {
    return new Intl.DateTimeFormat("fr-BE", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  } catch {
    return d.toISOString();
  }
}

function nextAttendeeIndexForOrder(orderId: string, attendees: Attendee[]) {
  let max = 0;
  for (const a of attendees) {
    if (a.orderId === orderId) max = Math.max(max, a.attendeeIndex ?? 0);
  }
  return max + 1;
}

function makeLocalAnswers(params: {
  attendeeId: string;
  regFields: RegistrationFieldLike[];
  value: Record<string, any>;
}) {
  const { attendeeId, regFields, value } = params;
  const now = new Date().toISOString();

  const byKey = new Map<string, RegistrationFieldLike>();
  for (const f of regFields) {
    const k = String(f.fieldKey ?? "").trim();
    if (k) byKey.set(k, f);
  }

  const out: AttendeeAnswer[] = [];

  for (const [key, raw] of Object.entries(value ?? {})) {
    const k = String(key ?? "").trim();
    if (!k) continue;

    const field = byKey.get(k);
    const fieldType = (field?.fieldType ?? "text") as AttendeeAnswer["fieldTypeSnapshot"];
    const label = String(field?.label ?? k).trim();

    const isCheckbox = fieldType === "checkbox";
    const isEmpty = !isCheckbox && String(raw ?? "").trim().length === 0;
    if (isEmpty) continue;

    const v = isCheckbox ? (Boolean(raw) ? "Oui" : "Non") : String(raw ?? "").trim();

    out.push({
      id: `local:${attendeeId}:${k}`,
      attendeeId,
      fieldKeySnapshot: k,
      fieldTypeSnapshot: fieldType,
      fieldLabelSnapshot: label,
      value: v,
      createdAt: now,
      updatedAt: now,
    });
  }

  return out;
}

type FilterMode = "all" | "order" | `field:${string}`;

function buildUpdateAttendeeFromForm(params: {
  regFields: RegistrationFieldLike[];
  value: Record<string, any>;
}) {
  const { regFields, value } = params;

  const byKey = new Map<string, RegistrationFieldLike>();
  for (const f of regFields) {
    const k = String(f.fieldKey ?? "").trim();
    if (k) byKey.set(k, f);
  }

  const answers: any[] = [];

  for (const [key, raw] of Object.entries(value ?? {})) {
    const k = String(key ?? "").trim();
    if (!k) continue;

    const f = byKey.get(k);
    const fieldType = String(f?.fieldType ?? "text");

    const isCheckbox = fieldType === "checkbox";

    // ✅ on NE skip PAS les vides (sinon impossible de clear)
    const trimmed = String(raw ?? "").trim();
    const isEmpty = !isCheckbox && trimmed.length === 0;

    // ✅ tout est dans answers (snake case)
    const fieldKey = k; // déjà snake si tes regFields sont snake
    // si tu veux bétonner: const fieldKey = toSnakeKey(k);

    if (fieldType === "checkbox") {
      answers.push({ fieldKey, valueBool: Boolean(raw) });
    } else if (fieldType === "number") {
      // si vide => delete => on envoie rien en value_int (ou valueText vide)
      if (isEmpty) answers.push({ fieldKey, valueText: "" });
      else answers.push({ fieldKey, valueInt: Number(raw) });
    } else if (fieldType === "date") {
      answers.push({ fieldKey, valueDate: isEmpty ? "" : trimmed });
    } else {
      answers.push({ fieldKey, valueText: isEmpty ? "" : trimmed });
    }
  }

  return { answers }; // ✅ uniquement answers
}



export function SingleEventParticipantsSection(props: {
  data: AnyRecord;
  onChanged?: () => Promise<void>;
}) {
  const { data, onChanged } = props;

  /* -------------------- FILTER UI STATE -------------------- */
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [query, setQuery] = useState("");

  /* -------------------- EDITOR STATE -------------------- */
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create");
  const [editorOrderId, setEditorOrderId] = useState<string | null>(null);
  const [editingAttendeeId, setEditingAttendeeId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);
  const updateAttendee = useAdminUpdateOrderAttendee({ supabase });


  /* -------------------- DATA (initial -> local state) -------------------- */

  const initialAttendees = useMemo(
    () =>
      toRows<Attendee>(
        data?.attendees ??
          data?.eventAttendees ??
          data?.event_attendees ??
          data?.attendeeRows ??
          data?.attendee_rows ??
          data?.participants
      ),
    [data]
  );

  const initialAnswers = useMemo(
    () =>
      toRows<AttendeeAnswer>(
        data?.attendeeAnswers ??
          data?.attendee_answers ??
          data?.attendeesAnswers ??
          data?.attendees_answers ??
          data?.answers
      ),
    [data]
  );

  const [localAttendees, setLocalAttendees] = useState<Attendee[]>(() => initialAttendees);
  const [localAnswers, setLocalAnswers] = useState<AttendeeAnswer[]>(() => initialAnswers);

  // ✅ resync quand data change (refetch, switch tab, etc.)
  useEffect(() => {
    setLocalAttendees(initialAttendees);
  }, [initialAttendees]);

  useEffect(() => {
    setLocalAnswers(initialAnswers);
  }, [initialAnswers]);

  const orders = useMemo(
    () => toRows<AnyRecord>(data?.orders ?? data?.orderRows ?? data?.order_rows),
    [data]
  );

  // ✅ champs du formulaire d’inscription (source DB)
  const regFields = useMemo(() => {
    return toRows<RegistrationFieldLike>(
      data?.eventFormFields ??
        data?.event_form_fields ??
        data?.registrationFields ??
        data?.registration_fields ??
        data?.formFields ??
        data?.form_fields
    );
  }, [data]);

  /* -------------------- ORDER META -------------------- */

  const orderMetaById = useMemo(() => {
    const m = new Map<string, { orderNumber: string; createdAt?: string }>();
    for (const o of orders) {
      const id = getFirst<string>(o, ["id", "orderId", "order_id"]);
      if (!id) continue;
      m.set(id, {
        orderNumber:
          getFirst<string>(o, ["publicId", "public_id", "number", "ref", "reference"]) ??
          id.slice(0, 8),
        createdAt: getFirst<string>(o, ["createdAt", "created_at"]),
      });
    }
    return m;
  }, [orders]);

  /* -------------------- ANSWERS BY ATTENDEE -------------------- */

  const filledFieldsByAttendeeId = useMemo(() => {
    const map = new Map<string, { key: string; label: string; value: string }[]>();

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
      const uniq = new Map<string, { key: string; label: string; value: string }>();
      for (const f of arr) uniq.set(f.key, f);
      const list = Array.from(uniq.values());
      list.sort((a, b) => a.label.localeCompare(b.label));
      map.set(id, list);
    }

    return map;
  }, [localAnswers]);

  /* -------------------- FIELDS OPTIONS (dropdown) -------------------- */

  const fieldOptions = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of localAnswers) {
      const key = a.fieldKeySnapshot;
      const label = a.fieldLabelSnapshot || key;
      if (!key) continue;
      if (!m.has(key)) m.set(key, label);
    }
    const arr = Array.from(m.entries()).map(([key, label]) => ({ key, label }));
    arr.sort((a, b) => a.label.localeCompare(b.label));
    return arr;
  }, [localAnswers]);

  /* -------------------- IDENTITY -------------------- */

  function computeIdentity(attendeeId: string) {
    const fields = filledFieldsByAttendeeId.get(attendeeId) ?? [];
    const getVal = (...keys: string[]) => fields.find((f) => keys.includes(f.key))?.value ?? "";

    const full = `${getVal("firstName", "prenom", "first_name")} ${getVal("lastName", "nom", "last_name")}`.trim();
    const email = getVal("email");

    return {
      title: full || email || "Participant",
      subtitle: full && email ? email : "",
    };
  }

  /* -------------------- FILTERED ATTENDEES -------------------- */

  const filteredAttendees = useMemo(() => {
    const q = normalizeSearch(query);
    if (!q) return localAttendees;

    const mode = filterMode;

    const matchOrder = (orderId: string) => {
      const orderNum = orderMetaById.get(orderId)?.orderNumber ?? "";
      return normalizeSearch(orderNum).includes(q);
    };

    const matchAnyField = (attendeeId: string) => {
      const fields = filledFieldsByAttendeeId.get(attendeeId) ?? [];
      return fields.some((f) => normalizeSearch(f.value).includes(q));
    };

    const matchFieldKey = (attendeeId: string, key: string) => {
      const fields = filledFieldsByAttendeeId.get(attendeeId) ?? [];
      const found = fields.find((f) => f.key === key);
      return found ? normalizeSearch(found.value).includes(q) : false;
    };

    return localAttendees.filter((att) => {
      if (mode === "order") return matchOrder(att.orderId);

      if (mode.startsWith("field:")) {
        const key = mode.slice("field:".length);
        if (!key) return false;
        return matchFieldKey(att.id, key);
      }

      return matchOrder(att.orderId) || matchAnyField(att.id);
    });
  }, [localAttendees, query, filterMode, orderMetaById, filledFieldsByAttendeeId]);

  /* -------------------- GROUP BY ORDER (on filtered) -------------------- */

  const groups = useMemo(() => {
    const m = new Map<string, Attendee[]>();
    for (const a of filteredAttendees) {
      const arr = m.get(a.orderId) ?? [];
      arr.push(a);
      m.set(a.orderId, arr);
    }

    const entries = Array.from(m.entries());

    entries.sort((a, b) => {
      const ad = orderMetaById.get(a[0])?.createdAt ?? "";
      const bd = orderMetaById.get(b[0])?.createdAt ?? "";
      return bd.localeCompare(ad);
    });

    for (const [, arr] of entries) {
      arr.sort((x, y) => (x.attendeeIndex ?? 0) - (y.attendeeIndex ?? 0));
    }

    return entries;
  }, [filteredAttendees, orderMetaById]);

  /* -------------------- EDITOR HELPERS -------------------- */

  function openCreate(orderId: string) {
    setEditorError(null);
    setEditorMode("create");
    setEditorOrderId(orderId);
    setEditingAttendeeId(null);
    setEditorOpen(true);
  }

  function openEdit(attendeeId: string, orderId: string) {
    setEditorError(null);
    setEditorMode("edit");
    setEditorOrderId(orderId);
    setEditingAttendeeId(attendeeId);
    setEditorOpen(true);
  }

  function closeEditor() {
    setEditorOpen(false);
    setEditingAttendeeId(null);
    setEditorOrderId(null);
    setEditorError(null);
  }

  const initialEditorValue = useMemo(() => {
    const base: Record<string, any> = {};
    if (editingAttendeeId) {
      const filled = filledFieldsByAttendeeId.get(editingAttendeeId) ?? [];
      for (const f of filled) base[f.key] = f.value;
    }
    return base;
  }, [editingAttendeeId, filledFieldsByAttendeeId]);

  async function handleSubmitParticipant(value: Record<string, any>) {
  try {
    setSaving(true);
    setEditorError(null);

    if (editorMode !== "edit" || !editingAttendeeId) {
      closeEditor();
      return;
    }

   const attendee = { answers: buildUpdateAttendeeFromForm({ regFields, value }).answers };


    
  const res = await updateAttendee.updateOrderAttendee({
    attendeeId: editingAttendeeId,
    attendee, 
  });




    if (!res) {
      // le hook a déjà mis une erreur lisible
      setEditorError(updateAttendee.error ?? "Impossible de modifier le participant");
      return;
    }

    // 2) patch local UI : remplace toutes les answers de ce participant
    const nextAnswers = makeLocalAnswers({
      attendeeId: editingAttendeeId,
      regFields,
      value,
    });

    setLocalAnswers((prev) => {
      const kept = prev.filter((a) => a.attendeeId !== editingAttendeeId);
      return [...nextAnswers, ...kept];
    });

    closeEditor();

    // 3) resync serveur (optionnel mais conseillé)
    if (typeof onChanged === "function") {
      try {
        await onChanged();
      } catch {
        // noop
      }
    }
  } catch (e: any) {
    setEditorError(e?.message ? String(e.message) : "Erreur inconnue");
  } finally {
    setSaving(false);
  }
}


  /* -------------------- RENDER -------------------- */

  return (
    <div className="adminParticipants adminSingleEventParticipants">
      <div className="adminParticipantsHeader">
        <h3 className="adminParticipantsTitle">Commandes</h3>
        <div className="adminParticipantsHint">
          {groups.length} commande(s) • {filteredAttendees.length} participant(s)
        </div>
      </div>

      {/* --- SEARCH BAR --- */}
      <div className="adminParticipantsSearch">
        <select
          className="adminSearchSelect"
          value={filterMode}
          onChange={(e) => setFilterMode(e.target.value as FilterMode)}
        >
          <option value="all">Tous</option>
          <option value="order">Commande</option>

          {fieldOptions.length > 0 ? (
            <optgroup label="Champs participant">
              {fieldOptions.map((f) => (
                <option key={f.key} value={`field:${f.key}`}>
                  {f.label}
                </option>
              ))}
            </optgroup>
          ) : null}
        </select>

        <input
          className="adminSearchInput"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            filterMode === "order"
              ? "Rechercher par numéro de commande…"
              : filterMode.startsWith("field:")
              ? "Rechercher dans le champ sélectionné…"
              : "Recherche globale…"
          }
        />

        {query.trim() ? (
          <Button variant="ghost" onClick={() => setQuery("")}>
            Réinitialiser
          </Button>
        ) : null}
      </div>

      {groups.length === 0 ? (
        <div className="adminEventEmpty">
          {query.trim() ? "Aucun résultat avec ces filtres." : "Aucune inscription pour le moment."}
        </div>
      ) : (
        <AttendeeEditorPanel
          supabase={supabase}
          isOpen={editorOpen}
          mode={editorMode}
          fields={regFields}
          initialValue={initialEditorValue}
          onRequestClose={closeEditor}
          onSubmit={handleSubmitParticipant}
          isSaving={editorMode === "edit" ? updateAttendee.loading : saving}
          error={editorMode === "edit" ? updateAttendee.error : editorError}
          stickyTop={84}
          editorWidth={420}
          editorGap={14}
          products={toRows(data.products)}
          orderId={editorOrderId}
          onAdded={async ({ attendeeId, orderId, eventProductId, value }) => {
            const now = new Date().toISOString();

            const products = toRows<any>(data?.products);
            const prod = products.find((p) => String(p.id) === String(eventProductId));

            const newAttendee: Attendee = {
              id: attendeeId,
              orderId,
              productId: eventProductId,
              productNameSnapshot: String(prod?.name ?? "Ticket"),
              attendeeIndex: nextAttendeeIndexForOrder(orderId, localAttendees),
              createdAt: now,
              status: "reserved",
              confirmedAt: null,
              expiresAt: null,
              detailsCompletedAt: null,
              canceledAt: null,
            };

            const newAnswers = makeLocalAnswers({ attendeeId, regFields, value });

            setLocalAttendees((prev) => [newAttendee, ...prev]);
            setLocalAnswers((prev) => [...newAnswers, ...prev]);

            // petit confort: focus sur la commande où on vient d’ajouter
            setFilterMode("order");
            setQuery(orderMetaById.get(orderId)?.orderNumber ?? orderId.slice(0, 8));

            // resync serveur (optionnel mais conseillé)
            if (typeof onChanged === "function") {
              try {
                await onChanged();
              } catch {
                // noop
              }
            }
          }}
          left={
            <div className="adminOrdersGrid">
              {groups.map(([orderId, people]) => {
                const meta = orderMetaById.get(orderId);
                const orderNumber = meta?.orderNumber ?? orderId.slice(0, 8);

                return (
                  <div key={orderId} className="adminOrderCard">
                    {/* ---------- ORDER HEADER ---------- */}
                    <div className="adminOrderHeader">
                      <div>
                        <div className="adminOrderTitle">Commande {orderNumber}</div>
                        <div className="adminOrderSub">Créée le {formatDateTime(meta?.createdAt)}</div>
                      </div>

                      <div className="adminOrderHeaderRight">
                        <span className="adminOrderPill">
                          {people.length} inscrit{people.length > 1 ? "s" : ""}
                        </span>

                        <Button variant="primary" onClick={() => openCreate(orderId)}>
                          + Ajouter un participant
                        </Button>
                      </div>
                    </div>

                    {/* ---------- PARTICIPANTS ---------- */}
                    <div className="adminOrderPeople">
                      {people.map((att) => {
                        const identity = computeIdentity(att.id);
                        const filled = filledFieldsByAttendeeId.get(att.id) ?? [];

                        return (
                          <div key={att.id} className="adminPersonCard">
                            <div className="adminPersonTop">
                              <div>
                                <div className="adminPersonName">
                                  {identity.title}{" "}
                                  <span className="adminPersonIndex">#{att.attendeeIndex}</span>
                                </div>
                                {identity.subtitle ? (
                                  <div className="adminPersonSub">{identity.subtitle}</div>
                                ) : null}
                              </div>

                              <div className="adminPersonBadges">
                                <span className={`adminStatusBadge is-${att.status}`}>{att.status}</span>
                                <span className="adminProductBadge">{att.productNameSnapshot}</span>
                              </div>
                            </div>

                            <div className="adminFilledGrid">
                              {filled.length > 0 ? (
                                filled.map((f) => (
                                  <div key={f.key} className="adminFieldLine">
                                    <span className="adminFieldLabel">{f.label}</span>
                                    <span className="adminFieldValue">{normalizeStr(f.value)}</span>
                                  </div>
                                ))
                              ) : (
                                <div className="adminFilledEmpty">Aucun champ rempli.</div>
                              )}
                            </div>

                            <div className="adminPersonActionsBottom">
                              <Button variant="primary" onClick={() => openEdit(att.id, orderId)}>
                                Modifier
                              </Button>
                              <Button variant="danger">Supprimer</Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          }
        />
      )}
    </div>
  );
}
