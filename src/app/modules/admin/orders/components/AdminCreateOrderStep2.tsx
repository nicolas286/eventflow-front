import { MessageBox } from "@ui/components/message/MessageBox";
import type { AdminOrderStep2Input } from "../schemas/admin.orderCreateWizard.schema";

type FieldErrors<T> = Partial<Record<keyof T, string>>;

type Props = {
  form: AdminOrderStep2Input;
  fieldErrors: FieldErrors<AdminOrderStep2Input>;

  handleChange: <K extends keyof AdminOrderStep2Input>(key: K, value: AdminOrderStep2Input[K]) => void;
  handleBlur: <K extends keyof AdminOrderStep2Input>(key: K) => void;

  shouldShowFieldError: <K extends keyof AdminOrderStep2Input>(key: K, opts?: { hideUntilTouched?: boolean }) => boolean;

  currency: string;
  isFree: boolean;
  onResetRegisterError?: () => void;
};

export function AdminCreateOrderStep2({
  form,
  fieldErrors,
  handleChange,
  handleBlur,
  shouldShowFieldError,
  currency,
  isFree,
  onResetRegisterError,
}: Props) {
  return (
    <div className="adminCO_Step">
      <div className="adminCO_FieldBlock">
        <div className="adminCO_FieldLabel">Email acheteur</div>

        <input
          className="adminCO_Input"
          type="email"
          value={form.buyerEmail}
          onChange={(e) => {
            onResetRegisterError?.();
            handleChange("buyerEmail", e.target.value);
          }}
          onBlur={() => handleBlur("buyerEmail")}
          placeholder="ex: client@gmail.com"
        />

        {shouldShowFieldError("buyerEmail") && fieldErrors.buyerEmail ? (
          <MessageBox variant="error">{fieldErrors.buyerEmail}</MessageBox>
        ) : null}

        <div className="adminCO_Help">
          On en a besoin pour que la commande soit valide (et pour les mails si tu les actives).
        </div>

        {isFree ? (
          <MessageBox variant="info">
            Commande gratuite : aucune info de paiement n’est nécessaire.
          </MessageBox>
        ) : null}
      </div>

      <label className="adminCO_CheckRow">
        <input
          type="checkbox"
          checked={isFree ? false : form.markPaid}
          disabled={!!isFree}
          onChange={(e) => handleChange("markPaid", e.target.checked)}
          onBlur={() => handleBlur("markPaid")}
        />
        <div className="adminCO_FieldLabel">Marquer payé (offline)</div>
      </label>

      {!isFree && form.markPaid ? (
        <div className="adminCO_Step">
          <div className="adminCO_FieldBlock">
            <div className="adminCO_FieldLabel">Mode</div>
            <select
              className="adminCO_Select"
              value={form.payMode}
              onChange={(e) => handleChange("payMode", e.target.value as AdminOrderStep2Input["payMode"])}
              onBlur={() => handleBlur("payMode")}
            >
              <option value="deposit">Acompte (due now)</option>
              <option value="full">Total</option>
              <option value="custom">Montant personnalisé</option>
            </select>
          </div>

          {form.payMode === "custom" ? (
            <div className="adminCO_FieldBlock">
              <div className="adminCO_FieldLabel">Montant (cents)</div>
              <input
                className="adminCO_Input"
                type="number"
                min={1}
                value={form.customAmountCents}
                onChange={(e) => {
                  const raw = e.target.value;
                  handleChange(
                    "customAmountCents",
                    (raw === "" ? "" : Number(raw)) as AdminOrderStep2Input["customAmountCents"]
                  );
                }}
                onBlur={() => handleBlur("customAmountCents")}
              />

              {shouldShowFieldError("customAmountCents") && fieldErrors.customAmountCents ? (
                <MessageBox variant="error">{fieldErrors.customAmountCents}</MessageBox>
              ) : null}

              <div className="adminCO_Help">Exemple: 3500 = 35,00 {currency}</div>
            </div>
          ) : null}

          <div className="adminCO_FieldBlock">
            <div className="adminCO_FieldLabel">Méthode</div>
            <select
              className="adminCO_Select"
              value={form.paymentMethod}
              onChange={(e) => handleChange("paymentMethod", e.target.value as AdminOrderStep2Input["paymentMethod"])}
              onBlur={() => handleBlur("paymentMethod")}
            >
              <option value="cash">Cash</option>
              <option value="bank">Virement</option>
              <option value="card">Carte</option>
              <option value="other">Autre</option>
            </select>
          </div>

          <div className="adminCO_FieldBlock">
            <div className="adminCO_FieldLabel">Note</div>
            <textarea
              className="adminCO_Textarea"
              value={form.note}
              onChange={(e) => handleChange("note", e.target.value)}
              onBlur={() => handleBlur("note")}
              placeholder="ex: payé sur place"
            />

            {shouldShowFieldError("note") && fieldErrors.note ? (
              <MessageBox variant="error">{fieldErrors.note}</MessageBox>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
