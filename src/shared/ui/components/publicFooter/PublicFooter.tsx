import { Link } from "react-router-dom";
import "./publicFooter.desktop.css";
import "./publicFooter.mobile.css";

export default function PublicFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="publicFooter">
      <div className="publicFooterDivider" />

      <div className="publicFooterContent">
        <div className="publicFooterLeft">
          © {year} <strong>Eventflow</strong>. Tous droits réservés.
        </div>

        <div className="publicFooterRight">
          <Link to="/mentions-legales" className="publicFooterLink">
            Mentions légales
          </Link>
          <span className="publicFooterSep">·</span>
          <Link to="/politique-confidentialite" className="publicFooterLink">
            Politique de confidentialité
          </Link>
          <span className="publicFooterSep">·</span>
          <Link to="/cgu" className="publicFooterLink">
            Conditions générales d’utilisation
          </Link>
        </div>
      </div>

       <div className="publicFooterSupport">
        Besoin d’aide ?{" "}
        <a
          href="mailto:support@useeventflow.eu"
          className="publicFooterLink"
        >
          support@useeventflow.eu
        </a>
      </div>
    </footer>
  );
}
