import "../../styles/desktop/auth.desktop.css";
import "../../styles/mobile/auth.mobile.css";

import { Link } from "react-router-dom";
import { SignInForm } from "../../ui/components/forms/SignInForm";
import PublicFooter from "../../ui/components/publicFooter/PublicFooter";
import { EventFlowLogo } from "../../ui/components/branding/EventFlowLogo";

export function AdminLoginPage() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        
        <EventFlowLogo/>

        <div className="auth-header">
          <h1 className="auth-title">Bienvenue sur Eventflow</h1>
          <p className="auth-subtitle">
            Connectez-vous pour gérer vos événements
          </p>
        </div>

        <SignInForm />

        <div className="auth-links">
          <Link to="/admin/signup" className="auth-link">
            Créer un compte
          </Link>
          <Link to="/admin/forgot-password" className="auth-link muted">
            Mot de passe oublié ?
          </Link>
        </div>
      </div>
        <PublicFooter />
    </div>
    
  );
}
