import { Routes, Route, Navigate } from "react-router-dom";

/* Admin pages */
import { AdminLoginPage } from "./pages/admin/AdminLoginPage";
import { AdminSignUpPage } from "./pages/admin/AdminSignUpPage";
import { AdminHomePage } from "./pages/admin/AdminHomePage";

/* Public pages */
import { OrgPublicPage } from "./pages/public/OrgPublicPage";
import { EventPublicPage } from "./pages/public/EventPublicPage";

/* Layouts */
import { AdminLayout } from "./components/layouts/AdminLayout";
import { PublicLayout } from "./components/layouts/PublicLayout";

/* Misc */
import { NotFoundPage } from "./pages/public/NotFoundPage";

function App() {
  return (
    <Routes>
      {/* =========================
          ADMIN – AUTH
         ========================= */}
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin/signup" element={<AdminSignUpPage />} />

      {/* =========================
          ADMIN – PROTÉGÉ
         ========================= */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminHomePage />} />
        {/* plus tard :
            <Route path="events/:eventId" element={<AdminEventPage />} />
        */}
      </Route>

      {/* =========================
          PUBLIC
         ========================= */}
      <Route path="/o/:orgSlug" element={<PublicLayout />}>
        <Route index element={<OrgPublicPage />} />
        <Route path="e/:eventSlug" element={<EventPublicPage />} />
      </Route>

      {/* =========================
          ROOT / FALLBACK
         ========================= */}
      <Route path="/" element={<Navigate to="/admin/login" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
