import { Route, Navigate } from "react-router-dom";

import { PublicShellLayout } from "@ui/layouts/PublicShellLayout";
import { PublicLayout } from "@ui/layouts/PublicLayout";

import { OrgPublicPage } from "@public-pages/OrgPublicPage";
import { EventTicketsPage } from "@public-pages/EventTicketsPage";
import { EventAttendeesPage } from "@public-pages/EventAttendeesPage";
import { EventPaymentPage } from "@public-pages/EventPaymentPage";
import { OrderPage } from "@public-pages/OrderPage";
import LegalPage from "@public-pages/Legal";
import PrivacyPage from "@public-pages/Privacy";
import TermsPage from "@public-pages/TermsPage";

export const PublicRoutes = (
  <>
    <Route element={<PublicShellLayout />}>
      <Route path="/o/:orgSlug" element={<PublicLayout />}>
        <Route index element={<OrgPublicPage />} />
        <Route path="e/:eventSlug" element={<Navigate to="billets" replace />} />
        <Route path="e/:eventSlug/billets" element={<EventTicketsPage />} />
        <Route path="e/:eventSlug/participants" element={<EventAttendeesPage />} />
        <Route path="e/:eventSlug/paiement" element={<EventPaymentPage />} />
      </Route>

      <Route path="/order/:orderId" element={<OrderPage />} />
      <Route path="/mentions-legales" element={<LegalPage />} />
      <Route path="/politique-confidentialite" element={<PrivacyPage />} />
      <Route path="/cgu" element={<TermsPage />} />
    </Route>
  </>
);