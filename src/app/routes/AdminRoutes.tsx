import { Route, Navigate } from "react-router-dom";

import AdminAbonnementPage from "@admin-pages/AdminAbonnementPage";
import AdminBrandingPage from "@admin-pages/AdminBrandingPage";
import AdminDashboard from "@admin-pages/AdminDashboard";
import AdminEventsPage from "@admin-pages/AdminEventsPage";
import { AdminForgotPasswordPage } from "@admin-pages/AdminForgotPasswordPage";
import { AdminLoginPage } from "@admin-pages/AdminLoginPage";
import AdminProfilPage from "@admin-pages/AdminProfilPage";
import { AdminResetPasswordPage } from "@admin-pages/AdminResetPasswordPage";
import { AdminSignUpPage } from "@admin-pages/AdminSignUpPage";
import AdminStructurePage from "@admin-pages/AdminStructurePage";
import OnboardingWizard from "@admin-pages/OnboardingWizard";
import { AdminSingleEventPage } from "@admin-pages/singleEvent/AdminSingleEventPage";

import { AdminAuthLayout } from "../layouts/AdminAuthLayout";
import { AdminLayout } from "../layouts/AdminLayout";

export const AdminRoutes = (
  <>
    {/* ADMIN – AUTH */}
    <Route element={<AdminAuthLayout />}>
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin/signup" element={<AdminSignUpPage />} />
      <Route path="/admin/forgot-password" element={<AdminForgotPasswordPage />} />
      <Route path="/admin/reset-password" element={<AdminResetPasswordPage />} />
    </Route>

    {/* ADMIN – PROTÉGÉ */}
    <Route path="/admin" element={<AdminLayout />}>
      <Route element={<AdminDashboard />}>
        <Route index element={<Navigate to="events" replace />} />
        <Route path="events" element={<AdminEventsPage />} />
        <Route path="events/:eventSlug" element={<AdminSingleEventPage />} />
        <Route path="branding" element={<AdminBrandingPage />} />
        <Route path="structure" element={<AdminStructurePage />} />
        <Route path="profil" element={<AdminProfilPage />} />
        <Route path="abonnement" element={<AdminAbonnementPage />} />
        <Route path="onboarding" element={<OnboardingWizard />} />
      </Route>
    </Route>
  </>
);