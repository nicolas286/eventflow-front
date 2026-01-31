import { Routes, Route, Navigate } from "react-router-dom";

/* Admin pages */
import { AdminLoginPage } from "./pages/admin/AdminLoginPage";
import { AdminSignUpPage } from "./pages/admin/AdminSignUpPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminEventsPage from "./pages/admin/AdminEventsPage";
import AdminBrandingPage from "./pages/admin/AdminBrandingPage";
import AdminStructurePage from "./pages/admin/AdminStructurePage";
import AdminProfilPage  from "./pages/admin/AdminProfilPage";
import { AdminAbonnementPage } from "./pages/admin/AdminAbonnementPage";
import { AdminSingleEventPage } from "./pages/admin/AdminSingleEventPage";

/* Public pages */
import { OrgPublicPage } from "./pages/public/OrgPublicPage";
import { EventTicketsPage } from "./pages/public/EventTicketsPage";
import { EventAttendeesPage } from "./pages/public/EventAttendeesPage";
import { EventPaymentPage } from "./pages/public/EventPaymentPage";
import { OrderReturnPage } from "./pages/public/OrderReturnPage";

/* Layouts */
import { AdminLayout } from "./ui/layouts/AdminLayout";
import { PublicLayout } from "./ui/layouts/PublicLayout";

/* Misc */
import { NotFoundPage } from "./pages/public/NotFoundPage";
import { AdminAuthLayout } from "./ui/layouts/AdminAuthLayout";

function App() {
  return (
    <Routes>
      {/* ADMIN – AUTH */}
      <Route element={<AdminAuthLayout />}>
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin/signup" element={<AdminSignUpPage />} />
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
        </Route>
      </Route>

      {/* PUBLIC */}
      <Route path="/o/:orgSlug" element={<PublicLayout />}>
        <Route index element={<OrgPublicPage />} />

        {/* redirect old route to step 1 */}
        <Route
          path="e/:eventSlug"
          element={<Navigate to="billets" replace />}
        />

        <Route path="e/:eventSlug/billets" element={<EventTicketsPage />} />
        <Route path="e/:eventSlug/participants" element={<EventAttendeesPage />} />
        <Route path="e/:eventSlug/paiement" element={<EventPaymentPage />} />

      </Route>

      {/* PUBLIC - return Mollie */}
      <Route path="/order/:orderId" element={<OrderReturnPage />} />

      {/* ROOT / FALLBACK */}
      <Route path="/" element={<Navigate to="/admin/login" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
