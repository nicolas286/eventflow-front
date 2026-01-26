import { Routes, Route, Navigate } from "react-router-dom";

/* Admin pages */
import { AdminLoginPage } from "./pages/admin/AdminLoginPage";
import { AdminSignUpPage } from "./pages/admin/AdminSignUpPage";
import AdminDashboard from "./pages/admin/AdminDashboard";


/* Public pages */
import { OrgPublicPage } from "./pages/public/OrgPublicPage";
import { EventPublicPage } from "./pages/public/EventPublicPage";

/* Layouts */
import { AdminLayout } from "./ui/layouts/AdminLayout";
import { PublicLayout } from "./ui/layouts/PublicLayout";

/* Misc */
import { NotFoundPage } from "./pages/public/NotFoundPage";
import { AdminAuthLayout } from "./ui/layouts/AdminAuthLayout";


function App() {
  
  return (
    <Routes>
      {/* =========================
          ADMIN – AUTH
         ========================= */}
      <Route element={<AdminAuthLayout />}>
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin/signup" element={<AdminSignUpPage />} />
      </Route>


      {/* =========================
          ADMIN – PROTÉGÉ
         ========================= */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={ <AdminDashboard/>} />
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
