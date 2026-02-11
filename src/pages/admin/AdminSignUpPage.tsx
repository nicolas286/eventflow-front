import "../../styles/desktop/auth.desktop.css";
import "../../styles/mobile/auth.mobile.css";

import { Link } from "react-router-dom";
import { SignUpForm } from "../../ui/components/forms/SignupForm";
import { EventFlowLogo } from "../../ui/components/branding/EventFlowLogo";
import PublicFooter from "../../ui/components/publicFooter/PublicFooter";

export function AdminSignUpPage() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        
        <EventFlowLogo/>

        <div className="auth-header">
          <h1 className="auth-title">Créer un compte Eventflow</h1>
          <p className="auth-subtitle">
            Inscrivez-vous pour commencer à gérer vos événements
          </p>
        </div>

        <SignUpForm />

        <div className="auth-links">
          <Link to="/admin/login" className="auth-link">
            Déjà un compte ? Se connecter
          </Link>
        </div>
      </div>
              <PublicFooter />
      
    </div>
  );
}
