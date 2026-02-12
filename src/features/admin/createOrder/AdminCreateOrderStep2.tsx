import { MessageBox } from "../../../ui/components/message/MessageBox";
import type { AdminOrderStep2Input } from "../../../domain/models/admin/admin.orderCreateWizard.schema";

type FieldErrors<T> = Partial<Record<keyof T, string>>;

type Props = {
  form: AdminOrderStep2Input;
  fieldErrors: FieldErrors<AdminOrderStep2Input>;

  handleChange: <K extends keyof AdminOrderStep2Input>(
    key: K,
    value: AdminOrderStep2Input[K]
  ) => void;

  handleBlur: <K extends keyof AdminOrderStep2Input>(key: K) => void;

  shouldShowFieldError: <K extends keyof AdminOrderStep2Input>(
    key: K,
    opts?: { hideUntilTouched?: boolean }
  ) => boolean;

  currency: string;
  onResetRegisterError?: () => void;
};

export function AdminCreateOrderStep2({
  form,
  fieldErrors,
  handleChange,
  handleBlur,
  shouldShowFieldError,
  currency,
  onResetRegisterError,
}: Props) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {/* Email */}
      <div>
        <div style={{ fontWeight: 900, marginBottom: 6 }}>Email acheteur</div>
        <input
          type="email"
          value={form.buyerEmail}
          onChange={(e) => {
            onResetRegisterError?.();
            handleChange("buyerEmail", e.target.value);
          }}
          onBlur={() => handleBlur("buyerEmail")}
          placeholder="ex: client@gmail.com"
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid rgba(0,0,0,0.12)",
            outline: "none",
          }}
        />
        {shouldShowFieldError("buyerEmail") && fieldErrors.buyerEmail ? (
          <MessageBox variant="error">{fieldErrors.buyerEmail}</MessageBox>
        ) : null}

        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
          On en a besoin pour que la commande soit valide (et pour les mails si tu les actives).
        </div>
      </div>

      {/* markPaid */}
      <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <input
          type="checkbox"
          checked={form.markPaid}
          onChange={(e) => handleChange("markPaid", e.target.checked)}
          onBlur={() => handleBlur("markPaid")}
          style={{ width: 18, height: 18 }}
        />
        <div style={{ fontWeight: 900 }}>Marquer payé (offline)</div>
      </label>

      {form.markPaid ? (
        <div style={{ display: "grid", gap: 10 }}>
          {/* payMode */}
          <div>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Mode</div>
            <select
              value={form.payMode}
              onChange={(e) => handleChange("payMode", e.target.value as AdminOrderStep2Input["payMode"])}
              onBlur={() => handleBlur("payMode")}
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

          {/* customAmountCents */}
          {form.payMode === "custom" ? (
            <div>
              <div style={{ fontWeight: 900, marginBottom: 6 }}>Montant (cents)</div>
              <input
                type="number"
                min={1}
                value={form.customAmountCents}
                onChange={(e) => {
                  const raw = e.target.value;
                  // ton schema accepte "" ou number -> on respecte
                  handleChange(
                    "customAmountCents",
                    (raw === "" ? "" : Number(raw)) as AdminOrderStep2Input["customAmountCents"]
                  );
                }}
                onBlur={() => handleBlur("customAmountCents")}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.12)",
                  outline: "none",
                }}
              />
              {shouldShowFieldError("customAmountCents") && fieldErrors.customAmountCents ? (
                <MessageBox variant="error">{fieldErrors.customAmountCents}</MessageBox>
              ) : null}

              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
                Exemple: 3500 = 35,00 {currency}
              </div>
            </div>
          ) : null}

          {/* paymentMethod */}
          <div>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Méthode</div>
            <select
              value={form.paymentMethod}
              onChange={(e) =>
                handleChange("paymentMethod", e.target.value as AdminOrderStep2Input["paymentMethod"])
              }
              onBlur={() => handleBlur("paymentMethod")}
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

          {/* note */}
          <div>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Note</div>
            <textarea
              value={form.note}
              onChange={(e) => handleChange("note", e.target.value)}
              onBlur={() => handleBlur("note")}
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
            {shouldShowFieldError("note") && fieldErrors.note ? (
              <MessageBox variant="error">{fieldErrors.note}</MessageBox>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
