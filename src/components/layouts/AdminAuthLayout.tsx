import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "../../providers/AuthProvider/useAuth";

export function AdminAuthLayout() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user) return <Navigate to="/admin" replace />;

  return <Outlet />;
}
