import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../gateways/supabase/supabaseClient";
import { useAdminRegister } from "../hooks/useAdminRegister";
import { MessageBox } from "../../../ui/components/message/MessageBox";
import { AdminCreateOrderStep1 } from "./AdminCreateOrderStep1";
import { AdminCreateOrderStep2 } from "./AdminCreateOrderStep2";
import { AdminCreateOrderStep3 } from "./AdminCreateOrderStep3";
import { AdminCreateOrderFooter } from "./AdminCreateOrderFooter";
import { useLiveForm } from "../../public/useLiveZodForm";
import {
  adminOrderStep2Schema,
  type AdminOrderStep2Input,
} from "../../../domain/models/admin/admin.orderCreateWizard.schema";
import type { EventFormField } from "../../../domain/models/db/db.eventFormFields.schema";
import { validateFieldValue } from "../../../domain/helpers/validateFieldValue";
import { 
  sortFields, 
  isFieldFilled, 
  areAllAttendeesValid
} from "../../../domain/helpers/fields";
import type { EventProduct } from "../../../domain/models/db/db.eventProducts.schema";
import { 
  computeNextQty, 
  computeRemaining, 
  sortProducts, 
  quantitiesToItems, 
  sumItemQuantities,
  computeTotalCents, 
  resolveCurrency,
  computeExpectedAttendeeSlots, 
  reconcileAttendeesByIndex } from "../../../domain/helpers/logic";
import type { OrderUI } from "../../../domain/models/admin/admin.ordersSchema";
import { getFieldKey } from "../../../domain/helpers/fields";

function computeAttendeeErrors(fields: EventFormField[], values: Record<string, unknown>) {
  const errs: Record<string, string> = {};
  for (const f of fields) {
    const key = getFieldKey(f);
    if (!key) continue;

    const msg = validateFieldValue(f, values[key]);
    if (msg) errs[key] = msg;
  }
  return errs;
}

type Step = 1 | 2 | 3;

type AttendeeSlot = {
  eventProductId: string;
  values: Record<string, unknown>;
};

type AttendeeAnswerPayload = {
  eventFormFieldId: string;
  value: unknown;
};


type Props = {
  isOpen: boolean;
  onRequestClose: () => void;

  left: React.ReactNode;
  stickyTop?: number;
  editorWidth?: number;
  editorGap?: number;

  eventId: string;
  products: EventProduct[];
  regFields: EventFormField[];

  onCreated: (p: { orderId: string; order: Partial<OrderUI> }) => void | Promise<void>;
};

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

  const sortedProducts = useMemo(
    () => sortProducts(products),
    [products]);

  const sortedFields = useMemo(
    () => sortFields(regFields),
    [regFields]);

  const [step, setStep] = useState<Step>(1);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [attTouched, setAttTouched] = useState<Record<number, Record<string, true>>>({});

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

  const [attendees, setAttendees] = useState<AttendeeSlot[]>([]);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const cart = useMemo(() => {
  const items = quantitiesToItems(quantities);
  const totalTickets = sumItemQuantities(items);
  const totalCents = computeTotalCents(items, sortedProducts);
  const currency = resolveCurrency(sortedProducts);
  const expectedSlots = computeExpectedAttendeeSlots(sortedProducts, quantities);

    return { items, totalTickets, totalCents, currency, expectedSlots };
  }, [quantities, sortedProducts]);

  const isFree = cart.totalCents <= 0;

  useEffect(() => {
    if (!isOpen) return;
    if (!isFree) return;

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
  }, [isOpen, isFree]);




  useEffect(() => {
  if (!isOpen) return;
  setAttendees((prev) => reconcileAttendeesByIndex(prev, cart.expectedSlots));
  }, [isOpen, cart.expectedSlots]);

  function updateQty(productId: string, nextQty: number) 
  {
    const p = sortedProducts.find((x) => x.id === productId);
    if (!p) return;

    const remaining = computeRemaining(p);
    const q = computeNextQty(nextQty, remaining);

    setQuantities((prev) => ({ ...prev, [productId]: q }));
  }

  function setAnswer(attIndex: number, fieldKey: string, value: unknown) {
  setAttendees((prev) =>
    prev.map((a, i) => (i === attIndex ? { ...a, values: { ...a.values, [fieldKey]: value } } : a)),
  );

  setAttTouched((prev) => {
    const row = prev[attIndex] ?? {};
    if (row[fieldKey]) return prev;
    return { ...prev, [attIndex]: { ...row, [fieldKey]: true } };
  });
}


  const allAttendeesValid = useMemo(
  () => areAllAttendeesValid(attendees, sortedFields, isFieldFilled),
  [attendees, sortedFields]
  );

  function canGoStep2() {
    return cart.totalTickets > 0;
  }

  function canGoStep3() {
    return adminOrderStep2Schema.safeParse(s2).success;
  }

  function gotoNext() {
    if (step === 1) {
      setStep(2);
      return;
    }

    step2.touchAll(["buyerEmail", "markPaid", "payMode", "customAmountCents", "paymentMethod", "note"]);
    const parsed = step2.validateAll();
    if (!parsed.ok) return;

    setStep(3);
  }

  async function submit() {
    setAttemptedSubmit(true);

    step2.touchAll(["buyerEmail", "markPaid", "payMode", "customAmountCents", "paymentMethod", "note"]);
    const parsed2 = step2.validateAll();
    if (!parsed2.ok) return;
    const s2data = parsed2.data;
    const isFree = cart.totalCents <= 0;
    const markPaid = isFree ? false : s2data.markPaid;
    const payMode = isFree ? "deposit" : s2data.payMode;

    const hasAttErrors = attendees.some((a) => {
      const errs = computeAttendeeErrors(sortedFields as EventFormField[], a.values ?? {});
      return Object.keys(errs).length > 0;
    });
    if (hasAttErrors) return;

    // map fieldKey -> fieldId pour construire answers
    const fieldIdByKey = new Map<string, string>();
    for (const f of sortedFields as EventFormField[]) {
      const k = String(f.fieldKey ?? "").trim();
      const id = String(f.id ?? "").trim();
      if (k && id) fieldIdByKey.set(k, id);
    }

    const payload = {
      eventId,
      items: cart.items.map((it) => ({ eventProductId: it.eventProductId, quantity: it.quantity })),

      attendees: attendees.map((a) => ({
      eventProductId: a.eventProductId,
      answers: Object.entries(a.values ?? {})
        .map(([fieldKey, value]): AttendeeAnswerPayload | null => {
          const eventFormFieldId = fieldIdByKey.get(fieldKey);
          if (!eventFormFieldId) return null;

          return {
            eventFormFieldId,
            value: value ?? null,
          };
        })
        .filter((x): x is AttendeeAnswerPayload => x !== null),
    })),

      buyerEmail: s2data.buyerEmail.trim(),

      markPaid,
      payMode,
      customAmountCents:
        s2data.markPaid && s2data.payMode === "custom" && typeof s2data.customAmountCents === "number"
          ? s2data.customAmountCents
          : undefined,
      paymentMethod: s2data.paymentMethod,
      note: s2data.note.trim() ? s2data.note.trim() : undefined,
    };

    const res = await adminRegister.register(payload);

    if (!res.ok) 
    {
      return;
    }

    const orderId = res.orderId;

    await onCreated({
      orderId,
      order: {
        id: orderId,
        publicId: orderId.slice(0, 8),
        createdAt: new Date().toISOString(),
        status: res?.status ?? (s2data.markPaid ? "paid" : "awaiting_payment"),
        totalCents: cart.totalCents,
        currency: cart.currency,
      },
    });

    onRequestClose();
  }

  if (!isOpen) return null;

  const canGoNext =
  step === 1 ? canGoStep2() :
  step === 2 ? canGoStep3() :
  false;

  const canSubmit = allAttendeesValid;


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

          {step === 1 && (
            <AdminCreateOrderStep1
              products={sortedProducts}
              quantities={quantities}
              updateQty={updateQty}
              computeRemaining={computeRemaining}
              cart={cart}
            />
          )}

          {step === 2 ? (
            <AdminCreateOrderStep2
              form={s2}
              fieldErrors={s2Errors}
              handleChange={s2Change}
              handleBlur={s2Blur}
              shouldShowFieldError={s2ShowErr}
              currency={cart.currency}
              isFree={isFree}
              onResetRegisterError={() => adminRegister.reset()}
            />
          ) : null}

          {step === 3 ? (
          <AdminCreateOrderStep3
            cart={cart}
            attendees={attendees}
            fields={sortedFields as EventFormField[]}    
            products={sortedProducts}
            attemptedSubmit={attemptedSubmit}
            computeAttendeeErrors={computeAttendeeErrors}
            setAnswer={setAnswer}
            attTouched={attTouched}
          />
        ) : null}

        </div>

        {/* footer */}
        <AdminCreateOrderFooter
          step={step}
          loading={adminRegister.loading}
          onRequestClose={onRequestClose}
          onBack={() => setStep((s) => (s === 3 ? 2 : 1))}
          onNext={gotoNext}
          onSubmit={submit}
          canGoNext={canGoNext}
          canSubmit={canSubmit}
        />
      </div>
    </div>
  );
}
