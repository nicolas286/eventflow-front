import { useEffect, useMemo, useState } from "react";
import { Button } from "../../../ui/components";
import { supabase } from "../../../gateways/supabase/supabaseClient";
import { useAdminRegister } from "../hooks/useAdminRegister";
import { MessageBox } from "../../../ui/components/message/MessageBox";
import { useLiveForm } from "../../public/useLiveZodForm";
import {
  adminOrderStep2Schema,
  type AdminOrderStep2Input,
} from "../../../domain/models/admin/admin.orderCreateWizard.schema";
import { z } from "zod";
import type { RegistrationFieldLike } from "../events/singleEvent/AttendeeEditorPanel";

// ---- helpers UI ----
function norm(s: unknown) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function isBirthDateField(f: any) {
  const k = norm(f.fieldKey);
  const l = norm(f.label);
  return k === "birthdate" || k === "dob" || l.includes("date de naissance");
}
function isCountryField(f: any) {
  const k = norm(f.fieldKey);
  const l = norm(f.label);
  return k === "country" || k === "pays" || l === "pays";
}
function isPhoneField(f: any) {
  const k = norm(f.fieldKey);
  const l = norm(f.label);
  return k === "phone" || k === "telephone" || k === "tel" || l.includes("telephone");
}

function validateFieldValue(f: any, value: unknown): string | null {
  if (!f?.isRequired) return null;

  if (f.fieldType === "checkbox") return value === true ? null : "Ce champ est requis.";

  if (value == null) return "Ce champ est requis.";

  if (isBirthDateField(f) || f.fieldType === "date") {
    if (typeof value !== "string" || value.trim() === "") return "Date requise.";
    return /^\d{4}-\d{2}-\d{2}$/.test(value) ? null : "Date invalide.";
  }

  if (f.fieldType === "number") {
    if (typeof value !== "number" || !Number.isFinite(value)) return "Nombre invalide.";
    return null;
  }

  if (f.fieldType === "email") {
    if (typeof value !== "string" || value.trim() === "") return "Email requis.";
    return z.string().email().safeParse(value.trim()).success ? null : "Email invalide.";
  }

  if (typeof value === "string") return value.trim() ? null : "Ce champ est requis.";
  if (typeof value === "boolean") return null;

  return "Ce champ est requis.";
}

function computeAttendeeErrors(fields: any[], values: Record<string, unknown>) {
  const errs: Record<string, string> = {};
  for (const f of fields) {
    const key = String(f.fieldKey ?? "").trim();
    if (!key) continue;
    const msg = validateFieldValue(f, values[key]);
    if (msg) errs[key] = msg;
  }
  return errs;
}

type Product = {
  id: string;
  name: string;
  priceCents?: number;
  currency?: string;
  sortOrder?: number;
  stockQty?: number | null;
  soldQty?: number | null;
  reservedQty?: number | null;
  createsAttendees?: boolean;
  attendeesPerUnit?: number | null;
};

type Step = 1 | 2 | 3;

type AttendeeSlot = {
  eventProductId: string;
  values: Record<string, unknown>; // keyed by fieldKey
};

type Props = {
  isOpen: boolean;
  onRequestClose: () => void;

  left: React.ReactNode;
  stickyTop?: number;
  editorWidth?: number;
  editorGap?: number;

  eventId: string;
  products: Product[];
  regFields: RegistrationFieldLike[];

  onCreated: (p: { orderId: string; order: any }) => void | Promise<void>;
};

function clampQty(next: number, stockQty: number | null | undefined) {
  const min = 0;
  const max = stockQty == null ? 99 : Math.max(0, stockQty);
  return Math.max(min, Math.min(max, next));
}

function computeRemaining(p: Product) {
  if (p.stockQty == null) return null;
  const remaining = Math.max(0, (p.stockQty ?? 0) - (p.soldQty ?? 0) - (p.reservedQty ?? 0));
  return remaining;
}

export function AdminOrderCreateWizardPanel(props: Props) {
  const {
    isOpen,
    onRequestClose,
    left,
    stickyTop = 84,
    editorWidth = 420,
    editorGap = 14,
    eventId,
    products,
    regFields,
    onCreated,
  } = props;

  const adminRegister = useAdminRegister({ supabase });

  const sortedProducts = useMemo(() => {
    return [...(products ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [products]);

  const sortedFields = useMemo(() => {
    const arr = [...(regFields ?? [])];
    arr.sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    return arr;
  }, [regFields]);

  const [step, setStep] = useState<Step>(1);

  // step 1: quantities
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  // step 2: live zod
  const step2 = useLiveForm<AdminOrderStep2Input>(adminOrderStep2Schema, {
    buyerEmail: "",
    markPaid: false,
    payMode: "deposit",
    customAmountCents: "",
    paymentMethod: "cash",
    note: "",
  });

  const {
    form: s2,
    fieldErrors: s2Errors,
    handleChange: s2Change,
    handleBlur: s2Blur,
    shouldShowFieldError: s2ShowErr,
  } = step2;

  // step 3: attendee slots
  const [attendees, setAttendees] = useState<AttendeeSlot[]>([]);

  // for showing attendee errors only after a submit attempt
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  // reset when opening
  useEffect(() => {
    if (!isOpen) return;

    setStep(1);
    setQuantities({});
    setAttendees([]);
    setAttemptedSubmit(false);

    step2.reset({
      buyerEmail: "",
      markPaid: false,
      payMode: "deposit",
      customAmountCents: "",
      paymentMethod: "cash",
      note: "",
    });

    adminRegister.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const items = useMemo(() => {
    return Object.entries(quantities)
      .map(([eventProductId, quantity]) => ({ eventProductId, quantity: Number(quantity) || 0 }))
      .filter((x) => x.quantity > 0);
  }, [quantities]);

  const totalTickets = useMemo(() => items.reduce((acc, it) => acc + it.quantity, 0), [items]);

  const totalCents = useMemo(() => {
    return items.reduce((acc, it) => {
      const p = sortedProducts.find((x) => x.id === it.eventProductId);
      const price = Number(p?.priceCents ?? 0) || 0;
      return acc + it.quantity * price;
    }, 0);
  }, [items, sortedProducts]);

  const currency = useMemo(() => sortedProducts[0]?.currency ?? "EUR", [sortedProducts]);

  const expectedSlots = useMemo(() => {
    const slots: Array<{ eventProductId: string }> = [];
    for (const p of sortedProducts) {
      const qty = Number(quantities[p.id] ?? 0) || 0;
      if (!p.createsAttendees) continue;
      const perUnit = Number(p.attendeesPerUnit ?? 0) || 0;
      const count = qty * perUnit;
      for (let i = 0; i < count; i++) slots.push({ eventProductId: p.id });
    }
    return slots;
  }, [sortedProducts, quantities]);

  // keep attendees array aligned with expected slots
  useEffect(() => {
    if (!isOpen) return;

    setAttendees((prev) => {
      const next = expectedSlots.map((slot, idx) => {
        const old = prev[idx];
        if (old && old.eventProductId === slot.eventProductId) return old;
        return { eventProductId: slot.eventProductId, values: {} };
      });
      return next;
    });
  }, [expectedSlots, isOpen]);

  function updateQty(productId: string, nextQty: number) {
    const p = sortedProducts.find((x) => x.id === productId);
    if (!p) return;

    const remaining = computeRemaining(p);
    const maxQty = remaining == null ? 99 : remaining;
    const q = clampQty(nextQty, maxQty);

    setQuantities((prev) => ({
      ...prev,
      [productId]: q,
    }));
  }

  function setAnswer(attIndex: number, fieldKey: string, value: unknown) {
    setAttendees((prev) =>
      prev.map((a, i) => (i === attIndex ? { ...a, values: { ...a.values, [fieldKey]: value } } : a)),
    );
  }

  function isFieldFilled(field: any, attendeeValues: Record<string, unknown>) {
    const v = attendeeValues[field.fieldKey];
    if (field.fieldType === "checkbox") return v === true;
    if (typeof v === "string") return v.trim().length > 0;
    if (typeof v === "number") return Number.isFinite(v);
    if (typeof v === "boolean") return true;
    return v != null;
  }

  const allAttendeesValid = useMemo(() => {
    if (attendees.length === 0) return true;
    if (sortedFields.length === 0) return true;

    return attendees.every((a) =>
      sortedFields.every((f: any) => (!f.isRequired ? true : isFieldFilled(f, a.values))),
    );
  }, [attendees, sortedFields]);

  function canGoStep2() {
    return totalTickets > 0;
  }

  function canGoStep3() {
    return adminOrderStep2Schema.safeParse(s2).success;
  }

  function gotoNext() {
    if (step === 1) {
      setStep(2);
      return;
    }

    // step === 2
    step2.touchAll(["buyerEmail", "markPaid", "payMode", "customAmountCents", "paymentMethod", "note"]);
    const parsed = step2.validateAll();
    if (!parsed.ok) return;

    setStep(3);
  }

  async function submit() {
    setAttemptedSubmit(true);

    // step2 hard validation
    step2.touchAll(["buyerEmail", "markPaid", "payMode", "customAmountCents", "paymentMethod", "note"]);
    const parsed2 = step2.validateAll();
    if (!parsed2.ok) return;
    const s2data = parsed2.data;

    // attendees validation
    const hasAttErrors = attendees.some((a) => {
      const errs = computeAttendeeErrors(sortedFields as any[], a.values ?? {});
      return Object.keys(errs).length > 0;
    });
    if (hasAttErrors) return;

    // map fieldKey -> fieldId pour construire answers
    const fieldIdByKey = new Map<string, string>();
    for (const f of sortedFields as any[]) {
      const k = String(f.fieldKey ?? "").trim();
      const id = String(f.id ?? "").trim();
      if (k && id) fieldIdByKey.set(k, id);
    }

    const payload = {
      eventId,
      items: items.map((it) => ({ eventProductId: it.eventProductId, quantity: it.quantity })),

      attendees: attendees.map((a) => ({
        eventProductId: a.eventProductId,
        answers: Object.entries(a.values ?? {})
          .map(([fieldKey, value]) => {
            const eventFormFieldId = fieldIdByKey.get(fieldKey);
            if (!eventFormFieldId) return null;
            return { eventFormFieldId, value: value ?? null };
          })
          .filter(Boolean) as any[],
      })),

      buyerEmail: s2data.buyerEmail.trim(),

      markPaid: s2data.markPaid,
      payMode: s2data.payMode,
      customAmountCents:
        s2data.markPaid && s2data.payMode === "custom" && typeof s2data.customAmountCents === "number"
          ? s2data.customAmountCents
          : undefined,
      paymentMethod: s2data.paymentMethod,
      note: s2data.note.trim() ? s2data.note.trim() : undefined,
    };

    const res = await adminRegister.register(payload as any);
    if (res && typeof res === "object" && (res as any).ok === false) return;

    const orderId = (res as any)?.orderId ?? (res as any)?.order_id;
    if (!orderId) throw new Error("ADMIN_REGISTER_NO_ORDER_ID");

    await onCreated({
      orderId,
      order: {
        id: orderId,
        publicId: orderId.slice(0, 8),
        createdAt: new Date().toISOString(),
        status: (res as any)?.status ?? (s2data.markPaid ? "paid" : "awaiting_payment"),
        totalCents,
        currency,
      },
    });

    onRequestClose();
  }

  if (!isOpen) return null;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `1fr ${editorGap}px ${editorWidth}px`,
        alignItems: "start",
      }}
    >
      <div style={{ minWidth: 0 }}>{left}</div>
      <div />
      <div
        style={{
          position: "sticky",
          top: stickyTop,
          width: editorWidth,
          background: "white",
          borderRadius: 14,
          border: "1px solid rgba(0,0,0,0.10)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
          overflow: "hidden",
        }}
      >
        {/* header */}
        <div style={{ padding: 14, borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
          <div style={{ fontWeight: 900, fontSize: 16 }}>Ajouter une commande</div>
          <div style={{ opacity: 0.75, fontSize: 13, marginTop: 4 }}>
            {step}/3 — {step === 1 ? "Billets" : step === 2 ? "Paiement" : "Participants"}
          </div>
        </div>

        {/* body */}
        <div style={{ padding: 14, display: "grid", gap: 12 }}>
          {adminRegister.error ? (
            <MessageBox variant="error">{adminRegister.error}</MessageBox>
          ) : null}

          {/* STEP 1 */}
          {step === 1 ? (
            <div style={{ display: "grid", gap: 10 }}>
              {sortedProducts.length === 0 ? (
                <div style={{ opacity: 0.8 }}>Aucun billet configuré.</div>
              ) : (
                sortedProducts.map((p) => {
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
                      style={{
                        border: "1px solid rgba(0,0,0,0.10)",
                        borderRadius: 12,
                        padding: 12,
                        opacity: soldOut ? 0.6 : 1,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 900 }}>{p.name}</div>
                          <div style={{ opacity: 0.75, fontSize: 13, marginTop: 2 }}>
                            {stockLabel}
                            {createsAtt ? ` · ${perUnit} participant(s) / billet` : ` · pas de formulaire participant`}
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Button variant="secondary" onClick={() => updateQty(p.id, qty - 1)} disabled={soldOut || qty <= 0}>
                            −
                          </Button>

                          <input
                            type="number"
                            min={0}
                            max={maxQty}
                            value={qty}
                            onChange={(e) => updateQty(p.id, Number(e.target.value))}
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

                          <Button variant="secondary" onClick={() => updateQty(p.id, qty + 1)} disabled={soldOut || qty >= maxQty}>
                            +
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              <div style={{ borderTop: "1px solid rgba(0,0,0,0.08)", paddingTop: 10, opacity: 0.85, fontSize: 13 }}>
                Récap : {totalTickets} billet(s) · {expectedSlots.length} participant(s) à renseigner ·{" "}
                {totalCents / 100} {currency}
              </div>
            </div>
          ) : null}

          {/* STEP 2 */}
          {step === 2 ? (
            <div style={{ display: "grid", gap: 10 }}>
              <div>
                <div style={{ fontWeight: 900, marginBottom: 6 }}>Email acheteur</div>
                <input
                  type="email"
                  value={s2.buyerEmail}
                  onChange={(e) => {
                    adminRegister.reset();
                    s2Change("buyerEmail", e.target.value);
                  }}
                  onBlur={() => s2Blur("buyerEmail")}
                  placeholder="ex: client@gmail.com"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(0,0,0,0.12)",
                    outline: "none",
                  }}
                />
                {s2ShowErr("buyerEmail") && s2Errors.buyerEmail ? (
                  <MessageBox variant="error">{s2Errors.buyerEmail}</MessageBox>
                ) : null}

                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
                  On en a besoin pour que la commande soit valide (et pour les mails si tu les actives).
                </div>
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input
                  type="checkbox"
                  checked={s2.markPaid}
                  onChange={(e) => s2Change("markPaid", e.target.checked)}
                  onBlur={() => s2Blur("markPaid")}
                  style={{ width: 18, height: 18 }}
                />
                <div style={{ fontWeight: 900 }}>Marquer payé (offline)</div>
              </label>

              {s2.markPaid ? (
                <div style={{ display: "grid", gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>Mode</div>
                    <select
                      value={s2.payMode}
                      onChange={(e) => s2Change("payMode", e.target.value as any)}
                      onBlur={() => s2Blur("payMode")}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: "1px solid rgba(0,0,0,0.12)",
                        outline: "none",
                      }}
                    >
                      <option value="deposit">Acompte (due now)</option>
                      <option value="full">Total</option>
                      <option value="custom">Montant personnalisé</option>
                    </select>
                  </div>

                  {s2.payMode === "custom" ? (
                    <div>
                      <div style={{ fontWeight: 900, marginBottom: 6 }}>Montant (cents)</div>
                      <input
                        type="number"
                        min={1}
                        value={s2.customAmountCents}
                        onChange={(e) =>
                          s2Change("customAmountCents", e.target.value === "" ? "" : Number(e.target.value))
                        }
                        onBlur={() => s2Blur("customAmountCents")}
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          borderRadius: 12,
                          border: "1px solid rgba(0,0,0,0.12)",
                          outline: "none",
                        }}
                      />
                      {s2ShowErr("customAmountCents") && s2Errors.customAmountCents ? (
                        <MessageBox variant="error">{s2Errors.customAmountCents}</MessageBox>
                      ) : null}

                      <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
                        Exemple: 3500 = 35,00 {currency}
                      </div>
                    </div>
                  ) : null}

                  <div>
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>Méthode</div>
                    <select
                      value={s2.paymentMethod}
                      onChange={(e) => s2Change("paymentMethod", e.target.value as any)}
                      onBlur={() => s2Blur("paymentMethod")}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: "1px solid rgba(0,0,0,0.12)",
                        outline: "none",
                      }}
                    >
                      <option value="cash">Cash</option>
                      <option value="bank">Virement</option>
                      <option value="card">Carte</option>
                      <option value="other">Autre</option>
                    </select>
                  </div>

                  <div>
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>Note</div>
                    <textarea
                      value={s2.note}
                      onChange={(e) => s2Change("note", e.target.value)}
                      onBlur={() => s2Blur("note")}
                      placeholder="ex: payé sur place"
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: "1px solid rgba(0,0,0,0.12)",
                        outline: "none",
                        minHeight: 80,
                        resize: "vertical",
                      }}
                    />
                    {s2ShowErr("note") && s2Errors.note ? (
                      <MessageBox variant="error">{s2Errors.note}</MessageBox>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* STEP 3 */}
          {step === 3 ? (
            <div style={{ display: "grid", gap: 12 }}>
              {expectedSlots.length === 0 ? (
                <div style={{ opacity: 0.8 }}>Aucun participant à renseigner pour ces billets.</div>
              ) : sortedFields.length === 0 ? (
                <div style={{ opacity: 0.8 }}>Aucun champ configuré sur le formulaire.</div>
              ) : (
                attendees.map((att, idx) => {
                  const p = sortedProducts.find((x) => x.id === att.eventProductId);
                  const attErrors = attemptedSubmit ? computeAttendeeErrors(sortedFields as any[], att.values ?? {}) : {};

                  return (
                    <div
                      key={idx}
                      style={{
                        border: "1px solid rgba(0,0,0,0.10)",
                        borderRadius: 12,
                        padding: 12,
                      }}
                    >
                      <div style={{ fontWeight: 900, marginBottom: 8 }}>
                        Participant {idx + 1}{" "}
                        <span style={{ fontWeight: 700, opacity: 0.7 }}>· {p?.name ?? "Ticket"}</span>
                      </div>

                      <div style={{ display: "grid", gap: 10 }}>
                        {sortedFields.map((f: any) => {
                          const value = att.values?.[f.fieldKey];
                          const commonStyle: React.CSSProperties = {
                            width: "100%",
                            padding: "10px 12px",
                            borderRadius: 12,
                            border: "1px solid rgba(0,0,0,0.12)",
                            outline: "none",
                          };

                          const label = (
                            <div style={{ fontWeight: 900, marginBottom: 6 }}>
                              {String(f.label ?? f.fieldKey)}{" "}
                              {f.isRequired ? <span style={{ opacity: 0.7 }}>(requis)</span> : null}
                            </div>
                          );

                          const errMsg = attErrors[String(f.fieldKey ?? "")];

                          if (isBirthDateField(f) || f.fieldType === "date") {
                            return (
                              <div key={String(f.id)}>
                                {label}
                                <input
                                  type="date"
                                  value={typeof value === "string" ? value : ""}
                                  onChange={(e) => setAnswer(idx, f.fieldKey, e.target.value)}
                                  style={commonStyle}
                                />
                                {errMsg ? <MessageBox variant="error">{errMsg}</MessageBox> : null}
                              </div>
                            );
                          }

                          if (isCountryField(f)) {
                            return (
                              <div key={String(f.id)}>
                                {label}
                                <input
                                  type="text"
                                  value={typeof value === "string" ? value : ""}
                                  onChange={(e) => setAnswer(idx, f.fieldKey, e.target.value)}
                                  style={commonStyle}
                                  placeholder="Pays"
                                />
                                {errMsg ? <MessageBox variant="error">{errMsg}</MessageBox> : null}
                              </div>
                            );
                          }

                          if (isPhoneField(f)) {
                            return (
                              <div key={String(f.id)}>
                                {label}
                                <input
                                  type="tel"
                                  value={typeof value === "string" ? value : ""}
                                  onChange={(e) => setAnswer(idx, f.fieldKey, e.target.value)}
                                  style={commonStyle}
                                  placeholder="Téléphone"
                                />
                                {errMsg ? <MessageBox variant="error">{errMsg}</MessageBox> : null}
                              </div>
                            );
                          }

                          if (f.fieldType === "textarea") {
                            return (
                              <div key={String(f.id)}>
                                {label}
                                <textarea
                                  value={typeof value === "string" ? value : ""}
                                  onChange={(e) => setAnswer(idx, f.fieldKey, e.target.value)}
                                  style={{ ...commonStyle, minHeight: 90, resize: "vertical" }}
                                />
                                {errMsg ? <MessageBox variant="error">{errMsg}</MessageBox> : null}
                              </div>
                            );
                          }

                          if (f.fieldType === "select") {
                            const opts = Array.isArray(f.options) ? f.options : [];
                            return (
                              <div key={String(f.id)}>
                                {label}
                                <select
                                  value={typeof value === "string" ? value : ""}
                                  onChange={(e) => setAnswer(idx, f.fieldKey, e.target.value)}
                                  style={commonStyle}
                                >
                                  <option value="">—</option>
                                  {opts.map((o: any, i: number) => (
                                    <option key={i} value={String(o.value ?? o)}>
                                      {String(o.label ?? o)}
                                    </option>
                                  ))}
                                </select>
                                {errMsg ? <MessageBox variant="error">{errMsg}</MessageBox> : null}
                              </div>
                            );
                          }

                          if (f.fieldType === "checkbox") {
                            return (
                              <div key={String(f.id)}>
                                <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                  <input
                                    type="checkbox"
                                    checked={value === true}
                                    onChange={(e) => setAnswer(idx, f.fieldKey, e.target.checked)}
                                    style={{ width: 18, height: 18 }}
                                  />
                                  <div style={{ fontWeight: 900 }}>
                                    {String(f.label ?? f.fieldKey)}{" "}
                                    {f.isRequired ? <span style={{ opacity: 0.7 }}>(requis)</span> : null}
                                  </div>
                                </label>
                                {errMsg ? <MessageBox variant="error">{errMsg}</MessageBox> : null}
                              </div>
                            );
                          }

                          const inputType =
                            f.fieldType === "email" ? "email" : f.fieldType === "number" ? "number" : "text";

                          return (
                            <div key={String(f.id)}>
                              {label}
                              <input
                                type={inputType}
                                value={
                                  inputType === "number"
                                    ? typeof value === "number"
                                      ? value
                                      : ""
                                    : typeof value === "string"
                                      ? value
                                      : ""
                                }
                                onChange={(e) =>
                                  setAnswer(
                                    idx,
                                    f.fieldKey,
                                    inputType === "number"
                                      ? e.target.value === ""
                                        ? null
                                        : Number(e.target.value)
                                      : e.target.value,
                                  )
                                }
                                style={commonStyle}
                              />
                              {errMsg ? <MessageBox variant="error">{errMsg}</MessageBox> : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}

              <div style={{ opacity: 0.8, fontSize: 13 }}>
                {expectedSlots.length} participant(s) · Total: {totalCents / 100} {currency}
              </div>
            </div>
          ) : null}
        </div>

        {/* footer */}
        <div
          style={{
            padding: 14,
            borderTop: "1px solid rgba(0,0,0,0.08)",
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <Button variant="secondary" onClick={onRequestClose} disabled={adminRegister.loading}>
            Fermer
          </Button>

          <div style={{ display: "flex", gap: 10 }}>
            {step > 1 ? (
              <Button
                variant="secondary"
                onClick={() => setStep((s) => (s === 3 ? 2 : 1))}
                disabled={adminRegister.loading}
              >
                Retour
              </Button>
            ) : null}

            {step < 3 ? (
              <Button
                variant="primary"
                onClick={gotoNext}
                disabled={adminRegister.loading || (step === 1 ? !canGoStep2() : !canGoStep3())}
              >
                Continuer
              </Button>
            ) : (
              <Button variant="primary" onClick={submit} disabled={adminRegister.loading || !allAttendeesValid}>
                {adminRegister.loading ? "Création…" : "Créer la commande"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
