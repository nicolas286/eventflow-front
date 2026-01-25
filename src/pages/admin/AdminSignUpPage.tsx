import { Link } from "react-router-dom";
import { SignUpForm } from "../../components/ui/components/forms/SignupForm";

export function AdminSignUpPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <SignUpForm />

      <p className="text-sm text-slate-600">
        Déjà un compte ?{" "}
        <Link
          to="/admin/login"
          className="text-blue-600 hover:underline"
        >
          Se connecter
        </Link>
      </p>
    </div>
  );
}
