import "../../styles/auth.css";
import { Link } from "react-router-dom";
import { SignInForm } from "../../ui/components/forms/SignInForm";

export function AdminLoginPage() {
  return (
    <div className="auth-page">
      <div className="auth-card">
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
    </div>
  );
}
