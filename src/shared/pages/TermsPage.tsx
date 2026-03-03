import { useNavigate } from "react-router-dom";

import { Container } from "@ui/components";
import Card, { CardBody, CardHeader } from "@ui/components/card/Card";
import Button from "@ui/components/button/Button";

import "./legalPage.desktop.css";
import "./legalPage.mobile.css";

export default function TermsPage() {
  const navigate = useNavigate();

  return (
    <Container>
      <div className="legalPage">
        <Card>
          <CardHeader title="Conditions générales d’utilisation" />

          <CardBody>

            <section className="legalSection">
              <p>
                Les présentes conditions générales d’utilisation (CGU)
                encadrent l’accès et l’utilisation de la plateforme Eventflow.
                Toute utilisation du service implique l’acceptation pleine et entière
                des présentes conditions.
              </p>
            </section>

            <section className="legalSection">
              <h2>1. Objet du service</h2>
              <p>
                Eventflow est une plateforme permettant aux organisateurs
                de créer, gérer et promouvoir des événements, ainsi que
                de collecter des réservations et paiements en ligne.
              </p>
              <p>
                Eventflow agit en tant que fournisseur technique et ne
                participe pas à l’organisation des événements.
              </p>
            </section>

            <section className="legalSection">
              <h2>2. Création de compte</h2>
              <p>
                L’accès à certaines fonctionnalités nécessite la création
                d’un compte utilisateur. L’utilisateur s’engage à fournir
                des informations exactes et à les maintenir à jour.
              </p>
              <p>
                L’utilisateur est responsable de la confidentialité de ses
                identifiants de connexion.
              </p>
            </section>

            <section className="legalSection">
              <h2>3. Responsabilité des organisateurs</h2>
              <p>
                Chaque organisateur est seul responsable :
              </p>
              <ul>
                <li>du contenu publié sur ses pages événementielles,</li>
                <li>des informations communiquées aux participants,</li>
                <li>du respect des obligations légales et fiscales liées à ses événements,</li>
                <li>du traitement des données personnelles des participants.</li>
              </ul>
              <p>
                Eventflow agit en qualité de prestataire technique et ne peut
                être tenu responsable des litiges entre organisateurs et participants.
              </p>
            </section>

            <section className="legalSection">
              <h2>4. Paiements</h2>
              <p>
                Les paiements en ligne sont traités via des prestataires
                de paiement tiers. Eventflow ne conserve pas les données
                complètes de cartes bancaires.
              </p>
              <p>
                Les frais liés aux transactions sont précisés lors de la
                souscription ou de l’activation des fonctionnalités payantes.
              </p>
            </section>

            <section className="legalSection">
              <h2>5. Disponibilité du service</h2>
              <p>
                Eventflow s’efforce d’assurer un accès continu au service,
                mais ne garantit pas l’absence d’interruptions, notamment
                pour maintenance ou mise à jour.
              </p>
            </section>

            <section className="legalSection">
              <h2>6. Propriété intellectuelle</h2>
              <p>
                L’ensemble de la plateforme Eventflow (structure, code,
                design, éléments visuels) est protégé par le droit
                d’auteur.
              </p>
              <p>
                Toute reproduction ou utilisation non autorisée est interdite.
              </p>
            </section>

            <section className="legalSection">
              <h2>7. Résiliation</h2>
              <p>
                L’utilisateur peut supprimer son compte à tout moment.
                Eventflow se réserve le droit de suspendre ou supprimer
                un compte en cas de non-respect des présentes conditions.
              </p>
            </section>

            <section className="legalSection">
              <h2>8. Droit applicable</h2>
              <p>
                Les présentes conditions sont soumises au droit belge.
                En cas de litige, les tribunaux compétents seront ceux
                du siège de l’éditeur.
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