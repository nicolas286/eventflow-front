import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "@providers/AuthProvider/useAuth";
import PublicFooter from "@ui/components/publicFooter/PublicFooter";

export function AdminLayout() {
  const { user, loading } = useAuth();

  if (loading) return null; // ou loader
  if (!user) return <Navigate to="/admin/login" replace />;

  return (
    <>
    <Outlet />
    <PublicFooter />
    </>
  );
}
