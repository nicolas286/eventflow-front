import { Routes, Route, Navigate } from "react-router-dom";
import { AdminRoutes } from "./AdminRoutes";
import { PublicRoutes } from "./PublicRoutes";
import { NotFoundPage } from "@shared/pages/NotFoundPage";

export function AppRoutes() {
  return (
    <Routes>
      {AdminRoutes}
      {PublicRoutes}

      <Route path="/" element={<Navigate to="/admin/login" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}