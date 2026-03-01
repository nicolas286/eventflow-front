import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@providers/AuthProvider/useAuth";
import { MessageBox } from "@ui/components/message/MessageBox";

export function AdminAuthLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();

  const isResetRoute = location.pathname === "/admin/reset-password";

  if (loading) {
    return (
      <div className="auth-shell" style={{ padding: 24 }}>
        <MessageBox variant="info">Chargement…</MessageBox>
      </div>
    );
  }

  if (user && !isResetRoute) return <Navigate to="/admin" replace />;

  return <Outlet />;
}
