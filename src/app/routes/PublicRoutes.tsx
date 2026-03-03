import { Route, Navigate } from "react-router-dom";

import { PublicShellLayout } from "../layouts/PublicShellLayout";
import { PublicLayout } from "../layouts/PublicLayout";

import { OrgPublicPage } from "@app/modules/public/organization/pages/OrgPublicPage";
import { EventTicketsPage } from "@app/modules/public/register/pages/EventTicketsPage";
import { EventAttendeesPage } from "@app/modules/public/register/pages/EventAttendeesPage";
import { EventPaymentPage } from "@app/modules/public/register/pages/EventPaymentPage";
import { OrderPage } from "@app/modules/public/register/pages/OrderPage";
import LegalPage from "@shared/pages/Legal";
import PrivacyPage from "@shared/pages/Privacy";
import TermsPage from "@shared/pages/TermsPage";

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