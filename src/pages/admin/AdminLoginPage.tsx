import { Link } from "react-router-dom";
import { SignInForm } from "../../components/ui/components/forms/SignInForm";

export function AdminLoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <SignInForm />

      <p className="text-sm text-slate-600">
        Pas encore de compte ?{" "}
        <Link
          to="/admin/signup"
          className="text-blue-600 hover:underline"
        >
          Créer un compte
        </Link>
      </p>
    </div>
  );
}
