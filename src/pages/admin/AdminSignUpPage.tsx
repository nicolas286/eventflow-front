import "../../styles/auth.css";
import { Link } from "react-router-dom";
import { SignUpForm } from "../../ui/components/forms/SignupForm";

export function AdminSignUpPage() {
  return (
    <div className="auth-page">
      <div className="auth-card">
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
    </div>
  );
}
