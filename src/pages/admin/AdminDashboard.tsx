import { useMemo, useState } from "react";
import "../../styles/adminDashBoard.css";

import { AdminStats, BrandingPanel, EventEditor, EventTable } from "../../features/admin";
import { supabase } from "../../gateways/supabase/supabaseClient";

import { useAdminDashboardData, type UiEvent } from "../../features/admin/hooks/useAdminDashboardData";

export default function AdminDashboard() {
  const { loading, error, bootstrap, orgId, events } = useAdminDashboardData({ supabase });

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // auto-select le 1er event quand la liste arrive
  useMemo(() => {
    if (!selectedEventId && events.length > 0) {
      setSelectedEventId(events[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events.length]);

  const selectedEvent: UiEvent | null = useMemo(
    () => (selectedEventId ? events.find((e) => e.id === selectedEventId) ?? null : null),
    [events, selectedEventId],
  );

  // Stats (fallback si pas de status dans subset)
  const stats = useMemo(() => {
    const active = events.length;

    const open = events.filter((e) => e.status === "open").length;
    const soldout = events.filter((e) => e.status === "soldout").length;

    return { active, open, soldout };
  }, [events]);

  // Org “compatible” BrandingPanel
  // - si BrandingPanel attend un objet "org" custom, on lui donne un mix
  const org = useMemo(() => {
    if (!bootstrap) return null;
    return {
      ...(bootstrap.organizationProfile ?? {}),
      ...(bootstrap.organization ?? {}),
      subscription: bootstrap.subscription ?? null,
      planLimits: bootstrap.planLimits ?? null,
      membership: bootstrap.membership ?? null,
    };
  }, [bootstrap]);

  // UI states
  if (loading) {
    return (
      <div className="adminPage">
        <div className="adminPageGrid">
          <div className="adminPageRight">Chargement…</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="adminPage">
        <div className="adminPageGrid">
          <div className="adminPageRight">Erreur : {error}</div>
        </div>
      </div>
    );
  }

  // Onboarding: user pas encore d’orga
  if (!orgId) {
    return (
      <div className="adminPage">
        <div className="adminPageGrid">
          <div className="adminPageRight">
            {/* À remplacer par ton composant onboarding */}
            <h2>Bienvenue 👋</h2>
            <p>Vous n’avez pas encore d’organisation. Créez-en une pour commencer.</p>
          </div>
        </div>
      </div>
    );
  }

  // ⚠️ Les anciennes fonctions update/delete étaient basées sur setEvents local.
  // Ici, on est en lecture RPC. Donc pour garder l’apparence/layout sans mentir :
  // - on garde les callbacks mais en "no-op" (ou tu les branches plus tard vers tes RPC mutations)
  const updateEvent = (_id: string, _patch: any) => {};
  const deleteEvent = (id: string) => {
    if (selectedEventId === id) setSelectedEventId(null);
  };

  return (
    <div className="adminPage">
      <AdminStats stats={stats} />

      <div className="adminPageGrid">
        <BrandingPanel org={org} setOrg={() => {}} />

        <div className="adminPageRight">
          <EventTable
            events={events.map((e) => ({
              // si EventTable attend {id,title,status,...} => on lui donne
              id: e.id,
              title: e.title ?? "",
              status: e.status ?? "draft",
              // bonus (si tu veux afficher quelque part dans le tableau)
              ordersCount: e.ordersCount,
              paidCents: e.paidCents,
              raw: e.raw,
            }))}
            editingId={selectedEventId ?? undefined}
            onSelect={setSelectedEventId}
            onDelete={deleteEvent}
            newTitle={""}
            setNewTitle={() => {}}
            onAdd={() => {}}
          />

          <EventEditor
            // si ton EventEditor veut un "Event" complet, tu peux lui passer raw
            // ou un objet mixé. Ici je donne un objet compatible simple.
            event={
              selectedEvent
                ? {
                    id: selectedEvent.id,
                    title: selectedEvent.title ?? "",
                    status: selectedEvent.status ?? "draft",
                    ordersCount: selectedEvent.ordersCount,
                    paidCents: selectedEvent.paidCents,
                    raw: selectedEvent.raw,
                  }
                : null
            }
            onUpdateEvent={(patch) => selectedEventId && updateEvent(selectedEventId, patch)}
            onAddTicket={() => {}}
            onUpdateTicket={() => {}}
            onRemoveTicket={() => {}}
          />
        </div>
      </div>
    </div>
  );
}
