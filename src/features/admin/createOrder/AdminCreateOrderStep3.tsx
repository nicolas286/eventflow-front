import type { EventFormFieldUI } from "../../../domain/models/db/db.eventFormFields.schema";
import type { EventProductUI } from "../../../domain/models/admin/ui/eventDetail/admin.eventDetailProduct.ui.schema";
import { AttendeeCard } from "./AttendeeCard";

export type AttendeeSlot = {
  eventProductId: string;
  values: Record<string, unknown>;
};

type CartSummary = {
  expectedSlots: { eventProductId: string }[];
  totalCents: number;
  currency: string;
};

type Props = {
  cart: CartSummary;

  attendees: AttendeeSlot[];
  fields: EventFormFieldUI[];
  products: EventProductUI[];

  attemptedSubmit: boolean;

  computeAttendeeErrors: (fields: EventFormFieldUI[], values: Record<string, unknown>) => Record<string, string>;
  setAnswer: (attIndex: number, fieldKey: string, value: unknown) => void;
};

export function AdminCreateOrderStep3({
  cart,
  attendees,
  fields,
  products,
  attemptedSubmit,
  computeAttendeeErrors,
  setAnswer,
}: Props) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {cart.expectedSlots.length === 0 ? (
        <div style={{ opacity: 0.8 }}>Aucun participant à renseigner pour ces billets.</div>
      ) : fields.length === 0 ? (
        <div style={{ opacity: 0.8 }}>Aucun champ configuré sur le formulaire.</div>
      ) : attendees.length === 0 ? (
        <div style={{ opacity: 0.8 }}>Chargement des participants…</div>
      ) : (
        attendees.map((att, idx) => {
          const product = products.find((x) => x.id === att.eventProductId);
          const errors =
            attemptedSubmit ? computeAttendeeErrors(fields, att.values ?? {}) : {};

          return (
            <AttendeeCard
              key={`${att.eventProductId}:${idx}`}
              index={idx}
              attendee={att}
              productName={product?.name ?? "Ticket"}
              fields={fields}
              errors={errors}
              setAnswer={setAnswer}
            />
          );
        })
      )}

      <div style={{ opacity: 0.8, fontSize: 13 }}>
        {cart.expectedSlots.length} participant(s) · Total: {cart.totalCents / 100}{" "}
        {cart.currency}
      </div>
    </div>
  );
}
