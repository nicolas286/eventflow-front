import { useEffect } from "react";
import { Button } from "../../../ui/components";
import { Badge } from "../../../ui/components";
import { Card, CardBody, CardHeader} from "../../../ui/components";
import { useMakeInvoiceList } from "../hooks/useMakeInvoiceList";
import { supabase } from "../../../gateways/supabase/supabaseClient";

function fmtMoneyCents(v: number | null | undefined) {
  if (v === null || v === undefined) return "—";
  return (v / 100).toLocaleString("fr-BE", { style: "currency", currency: "EUR" });
}
function fmtDateShort(d: string | null | undefined) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("fr-BE");
  } catch {
    return String(d);
  }
}

export function InvoicesTab({ orgId }: { orgId: string }) {
  const invoices = useMakeInvoiceList({ supabase });

  useEffect(() => {
    // charge la première page quand on arrive sur l’onglet
    invoices.fetchFirst({ orgId, limit: 25 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  async function onDownloadPdf(inv: any) {
    // Option A (souvent le plus simple) : tu stockes un pdf_url / pdf_path en DB
    // et tu ouvres une URL signée (ou publique) renvoyée par un RPC.
    //
    // Exemple si tu as un champ inv.pdf_url déjà prêt :
    if (inv.pdfUrl) {
      window.open(inv.pdfUrl, "_blank", "noopener,noreferrer");
      return;
    }

    // Option B : call un RPC "get_invoice_pdf_url" qui te renvoie une URL signée
    // const { data, error } = await supabase.rpc("get_invoice_pdf_url", { p_invoice_id: inv.id });
    // if (!error && data?.url) window.open(data.url, "_blank", "noopener,noreferrer");
    alert("Pas encore câblé: il me faut une url PDF (DB ou RPC).");
  }

  return (
    <Card>
      <CardHeader title="Mes factures" subtitle="Historique des factures et téléchargements PDF." />
      <CardBody>
        {invoices.error && (
          <div style={{ padding: 10, border: "1px solid #fecaca", background: "#fef2f2", borderRadius: 10 }}>
            {invoices.error}
          </div>
        )}

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
            <thead>
              <tr style={{ textAlign: "left", fontSize: 13, color: "#6b7280" }}>
                <th style={{ padding: "10px 8px" }}>Date</th>
                <th style={{ padding: "10px 8px" }}>Numéro</th>
                <th style={{ padding: "10px 8px" }}>Montant</th>
                <th style={{ padding: "10px 8px" }}>Statut</th>
                <th style={{ padding: "10px 8px" }} />
              </tr>
            </thead>

            <tbody>
              {invoices.items.length === 0 && !invoices.loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: 12, color: "#6b7280", fontSize: 14 }}>
                    Aucune facture pour l’instant.
                  </td>
                </tr>
              ) : (
                invoices.items.map((inv: any) => (
                  <tr key={inv.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                    <td style={{ padding: "10px 8px", fontSize: 14 }}>{fmtDateShort(inv.issuedAt)}</td>
                    <td style={{ padding: "10px 8px", fontSize: 14, fontWeight: 600 }}>{inv.number ?? "—"}</td>
                    <td style={{ padding: "10px 8px", fontSize: 14 }}>{fmtMoneyCents(inv.totalCents)}</td>
                    <td style={{ padding: "10px 8px" }}>
                      <Badge>{inv.status ?? "—"}</Badge>
                    </td>
                    <td style={{ padding: "10px 8px", width: 220 }}>
                      <Button variant="secondary" onClick={() => onDownloadPdf(inv)}>
                        Télécharger PDF
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
          <Button variant="secondary" disabled={invoices.loading} onClick={() => invoices.fetchFirst({ orgId })}>
            Rafraîchir
          </Button>

          <Button
            disabled={invoices.loading || !invoices.hasMore}
            onClick={() => invoices.fetchMore({ orgId })}
          >
            {invoices.loading ? "Chargement…" : invoices.hasMore ? "Charger plus" : "Tout est chargé"}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
