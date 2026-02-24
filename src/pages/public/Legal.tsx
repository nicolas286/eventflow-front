import { useNavigate } from "react-router-dom";

import Container from "../../ui/components/container/Container";
import Card, { CardBody, CardHeader } from "../../ui/components/card/Card";
import Button from "../../ui/components/button/Button";

import "../../styles/desktop/legalPage.desktop.css";
import "../../styles/mobile/legalPage.mobile.css";

export default function LegalPage() {
  const navigate = useNavigate();

  return (
    <Container>
      <div className="legalPage">
        <Card>
          <CardHeader title="Mentions légales" />

          <CardBody>
            <section className="legalSection">
              <h2>Éditeur du site</h2>
              <p><strong>Nom commercial :</strong> Eventflow</p>
              <p><strong>Responsable :</strong> Nicolas Manns</p>
              <p><strong>Statut :</strong> Entrepreneur individuel</p>
              <p>
                <strong>Siège social :</strong> Rue Féral 43, 5190
                Jemeppe-sur-Sambre, Belgique
              </p>
              <p>
                <strong>Adresse e-mail :</strong>{" "}
                <a href="mailto:contact@useeventflow.eu">
                  contact@useeventflow.eu
                </a>
              </p>
              <p>
                <strong>Numéro de téléphone :</strong> communiqué sur demande
              </p>
              <p><strong>Numéro de TVA :</strong> BE0840.386.125</p>
            </section>

            <section className="legalSection">
              <h2>Hébergement</h2>
              <p><strong>Dénomination sociale :</strong> Netlify, Inc.</p>
              <p>
                <strong>Adresse :</strong> 512 2nd Street, Suite 200,
                San Francisco, CA 94107, États-Unis
              </p>
              <p>
                <strong>Site web :</strong>{" "}
                <a
                  href="https://www.netlify.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  www.netlify.com
                </a>
              </p>
            </section>

            <section className="legalSection">
              <h2>Responsabilité</h2>
              <p>
                Les informations présentées sur le site Eventflow sont fournies
                à titre indicatif. Malgré tout le soin apporté à leur exactitude,
                l’éditeur ne saurait être tenu responsable des erreurs,
                omissions ou d’une éventuelle indisponibilité temporaire du site.
              </p>
              <p>
                L’éditeur se réserve le droit de modifier le contenu du site à
                tout moment et sans préavis.
              </p>
            </section>

            <section className="legalSection">
              <h2>Propriété intellectuelle</h2>
              <p>
                L’ensemble du contenu du site Eventflow (textes, images,
                graphismes, logos, icônes, structure, éléments techniques et
                visuels) est protégé par le droit d’auteur et la législation
                applicable en matière de propriété intellectuelle.
              </p>
              <p>
                Toute reproduction, représentation ou utilisation, totale ou
                partielle, sans autorisation écrite préalable est strictement
                interdite.
              </p>
            </section>

            {/* -------- Footer actions -------- */}
            <div className="legalFooter">
              <Button variant="secondary" onClick={() => navigate(-1)}>
                ← Retour
              </Button>
            </div>

          </CardBody>
        </Card>
      </div>
    </Container>
  );
}