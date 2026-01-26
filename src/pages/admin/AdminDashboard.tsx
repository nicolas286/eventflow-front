import { useMemo, useState } from "react";
import "../../styles/adminDashBoard.css";

import { AdminStats, BrandingPanel, EventEditor, EventTable } from "../../features/admin";
import { supabase } from "../../gateways/supabase/supabaseClient";
import { useAdminDashboardData } from "../../features/admin/hooks/useAdminDashboardData";
import type { EventOverviewRow } from "../../domain/models/eventOverviewRow.schema";

export default function AdminDashboard() {
  const { loading, error, bootstrap, orgId, events } = useAdminDashboardData({ supabase });

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const effectiveSelectedId =
    selectedEventId ?? (events.length > 0 ? events[0].event.id : null);

  const selectedRow = useMemo(() => {
    if (!effectiveSelectedId) return null;
    return events.find((e) => e.event.id === effectiveSelectedId) ?? null;
  }, [events, effectiveSelectedId]);

  const stats = useMemo(() => {
    const active = events.length;
    return { active, open: 0, soldout: 0 };
  }, [events]);

  const branding = useMemo(() => {
    const p = bootstrap?.organizationProfile;
    return {
      displayName: p?.displayName ?? (bootstrap?.organization?.name ?? ""),
      primaryColor: p?.primaryColor ?? null,
      logoUrl: p?.logoUrl ?? null,
    };
  }, [bootstrap]);

  const updateEvent = (
    _id: string,
    _patch: Partial<Pick<EventOverviewRow["event"], "title" | "isPublished">>
  ) => {};

  const deleteEvent = (id: string) => {
    if (effectiveSelectedId === id) setSelectedEventId(null);
  };

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

  if (!orgId) {
    return (
      <div className="adminPage">
        <div className="adminPageGrid">
          <div className="adminPageRight">
            <h2>Bienvenue 👋</h2>
            <p>Vous n’avez pas encore d’organisation. Créez-en une pour commencer.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="adminPage">
      <AdminStats stats={stats} />

      <div className="adminPageGrid">
        <BrandingPanel branding={branding} onChange={() => {}} />

        <div className="adminPageRight">
          <EventTable
            events={events}
            editingId={effectiveSelectedId ?? undefined}
            onSelect={setSelectedEventId}
            onDelete={deleteEvent}
            newTitle=""
            setNewTitle={() => {}}
            onAdd={() => {}}
          />

          <EventEditor
            event={selectedRow}
            onUpdateEvent={(patch) =>
              effectiveSelectedId && updateEvent(effectiveSelectedId, patch)
            }
          />
        </div>
      </div>
    </div>
  );
}
