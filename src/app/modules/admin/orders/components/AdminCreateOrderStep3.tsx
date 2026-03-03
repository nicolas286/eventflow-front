import type { EventFormField } from "@shared/models/db/db.eventFormFields.schema";
import type { EventProduct } from "@shared/models/db/db.eventProducts.schema";
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
  fields: EventFormField[];
  products: EventProduct[];

  attemptedSubmit: boolean;

  computeAttendeeErrors: (fields: EventFormField[], values: Record<string, unknown>) => Record<string, string>;
  setAnswer: (attIndex: number, fieldKey: string, value: unknown) => void;
  attTouched: Record<number, Record<string, true>>;
};

export function AdminCreateOrderStep3({
  cart,
  attendees,
  fields,
  products,
  attemptedSubmit,
  computeAttendeeErrors,
  setAnswer,
  attTouched,
}: Props) {
  return (
    <div className="adminCO_Step">
      {cart.expectedSlots.length === 0 ? (
        <div className="adminCO_Empty">Aucun participant à renseigner pour ces billets.</div>
      ) : fields.length === 0 ? (
        <div className="adminCO_Empty">Aucun champ configuré sur le formulaire.</div>
      ) : attendees.length === 0 ? (
        <div className="adminCO_Empty">Chargement des participants…</div>
      ) : (
        attendees.map((att, idx) => {
          const product = products.find((x) => x.id === att.eventProductId);
          const allErrors = computeAttendeeErrors(fields, att.values ?? {});
          const touched = attTouched[idx] ?? {};

          const errors = Object.fromEntries(
            Object.entries(allErrors).filter(([k]) => attemptedSubmit || touched[k])
          );

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

      <div className="adminCO_SummaryLine">
        {cart.expectedSlots.length} participant(s) · Total: {cart.totalCents / 100} {cart.currency}
      </div>
    </div>
  );
}
