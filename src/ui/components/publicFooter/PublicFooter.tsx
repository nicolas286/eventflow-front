import { Link } from "react-router-dom";
import "../../../styles/desktop/public/publicFooter.desktop.css";

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
        </div>
      </div>
    </footer>
  );
}
