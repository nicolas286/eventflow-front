import { useEffect, useMemo, useState } from "react";
import { Button, EditorShell } from "@ui/components";
import { normalizeText } from "@helpers/normalize";

type AnyRecord = Record<string, any>;


function makeLocalOrderId() {
  // id “stable” côté UI (pas uuid) : ok pour du local-only
  return `local-order:${Date.now()}:${Math.random().toString(16).slice(2)}`;
}

export function OrderEditorPanel(props: {
  isOpen: boolean;
  onRequestClose: () => void;

  stickyTop?: number;
  editorWidth?: number;
  editorGap?: number;

  left: React.ReactNode;

  onCreated?: (res: { orderId: string; order: AnyRecord }) => void;
}) {
  const {
    isOpen,
    onRequestClose,
    stickyTop = 84,
    editorWidth = 420,
    editorGap = 14,
    left,
    onCreated,
  } = props;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [publicId, setPublicId] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [status, setStatus] = useState<
    "pending" | "awaiting_payment" | "partially_paid" | "paid" | "canceled" | "expired"
  >("pending");

  useEffect(() => {
    if (!isOpen) return;
    setSaving(false);
    setError(null);
    setPublicId("");
    setBuyerEmail("");
    setStatus("pending");
  }, [isOpen]);

  const canSubmit = useMemo(() => true, []);

  async function handleCreate() {
    if (saving) return;

    try {
      setSaving(true);
      setError(null);

      const orderId = makeLocalOrderId();
      const now = new Date().toISOString();

      const order: AnyRecord = {
        id: orderId,
        created_at: now,

        // on garde des alias camel aussi (car ton code lit parfois les deux)
        createdAt: now,

        // numéro visible
        public_id: normalizeText(publicId) || orderId.slice(0, 8),
        publicId: normalizeText(publicId) || orderId.slice(0, 8),

        buyer_email: normalizeText(buyerEmail) || null,
        buyerEmail: normalizeText(buyerEmail) || null,

        status, // enum de tes commandes
        isLocal: true,
      };

      onCreated?.({ orderId, order });
      onRequestClose();
    } catch (e: any) {
      setError(e?.message ? String(e.message) : "Erreur inconnue");
    } finally {
      setSaving(false);
    }
  }

  return (
    <EditorShell
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      editorWidth={editorWidth}
      editorGap={editorGap}
      stickyTop={stickyTop}
      left={left}
      right={
        isOpen ? (
          <div className="adminTicketsEditorCard">
            <div className="adminTicketsEditorHeader">
              <div>
                <div className="adminTicketsEditorTitle">Ajouter une commande</div>
                <div className="adminEventHint">
                  Version locale : la commande sera ajoutée à l’interface uniquement (pas encore en base).
                </div>
              </div>
            </div>

            {error ? (
              <div className="adminEventHint" style={{ marginTop: 10, color: "#b91c1c" }}>
                {error}
              </div>
            ) : null}

            <div className="adminEventFormGrid" style={{ marginTop: 12 }}>
              <div className="adminEventField adminEventFieldSpan2">
                <div className="adminEventLabel">Référence / Numéro</div>
                <input
                  className="adminEventInput"
                  type="text"
                  value={publicId}
                  onChange={(e) => setPublicId(e.target.value)}
                  disabled={saving}
                  placeholder="ex: CMD-2026-0001"
                />
              </div>

              <div className="adminEventField adminEventFieldSpan2">
                <div className="adminEventLabel">Email acheteur (optionnel)</div>
                <input
                  className="adminEventInput"
                  type="email"
                  value={buyerEmail}
                  onChange={(e) => setBuyerEmail(e.target.value)}
                  disabled={saving}
                  placeholder="ex: client@email.com"
                />
              </div>

              <div className="adminEventField adminEventFieldSpan2">
                <div className="adminEventLabel">Statut</div>
                <select
                  className="adminEventInput"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  disabled={saving}
                >
                  <option value="pending">pending</option>
                  <option value="awaiting_payment">awaiting_payment</option>
                  <option value="partially_paid">partially_paid</option>
                  <option value="paid">paid</option>
                  <option value="canceled">canceled</option>
                  <option value="expired">expired</option>
                </select>
              </div>
            </div>

            <div className="adminTicketsEditorFooter">
              <Button variant="primary" onClick={handleCreate} disabled={!canSubmit || saving}>
                {saving ? "Création…" : "Créer la commande"}
              </Button>
            </div>
          </div>
        ) : null
      }
    />
  );
}
