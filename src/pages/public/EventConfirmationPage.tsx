import { Link, useParams, useSearchParams } from "react-router-dom";
import Container from "../../ui/components/container/Container";

export function EventConfirmationPage() {
  const { orgSlug, eventSlug } = useParams<{ orgSlug: string; eventSlug: string }>();
  const [sp] = useSearchParams();
  const orderId = sp.get("order");

  return (
    <div className="publicPage">
      <Container>
        <div className="publicSurface">
          <div style={{ fontWeight: 900, fontSize: 18 }}>✅ Réservation confirmée</div>
          <div style={{ marginTop: 8, opacity: 0.8 }}>
            {orderId ? <>Commande : <b>{orderId}</b></> : "Commande créée."}
          </div>

          <div style={{ marginTop: 16 }}>
            <Link to={`/o/${orgSlug}/e/${eventSlug}/billets`}>Retour aux billets</Link>
          </div>
        </div>
      </Container>
    </div>
  );
}
