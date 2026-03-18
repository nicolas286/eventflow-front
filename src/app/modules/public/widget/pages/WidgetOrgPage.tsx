import { useParams, useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import { supabase } from "@gateways/supabase/supabaseClient";
import { usePublicOrgData } from "../../organization/hooks/usePublicOrgData";
import { useWidgetTheme } from "../hooks/useWidgetTheme";
import { Button } from "@shared/ui/components";
import { useLocation } from "react-router-dom";

import "./WidgetOrgPage.css";
import { useWidgetAutoResize } from "../hooks/useWidgetAutoResize";
import { WidgetFooter } from "../components/WidgetFooter/WidgetFooter";
import { WidgetRoot } from "../components/WidgetRoot/WidgetRoot";
import { WidgetHeader } from "../components/WidgetHeader/WidgetHeader";
import { WidgetGrid } from "../components/WidgetGrid/WidgetGrid";
import { WidgetEventCard } from "../components/WidgetCard/WidgetEventCard";

export function WidgetOrgPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const navigate = useNavigate();
  const [nowTs] = useState(() => Date.now());
  const theme = useWidgetTheme();
  const { search } = useLocation();
  useWidgetAutoResize();

  const { loading, error, profile, events } = usePublicOrgData({
    supabase,
    orgSlug,
  });

  const MAX_EVENTS = 4;

const upcomingEvents = useMemo(() => {
  return (events ?? [])
    .filter((e) => {
      const ts = Date.parse(e.endsAt ?? e.startsAt ?? "");
      return Number.isFinite(ts) ? ts >= nowTs : true;
    })
    .sort((a, b) => Date.parse(a.startsAt ?? "") - Date.parse(b.startsAt ?? ""))
    .slice(0, MAX_EVENTS);
}, [events, nowTs]);

  if (!orgSlug) {
    return <div style={{ padding: 20 }}>Organisation introuvable</div>;
  }

  if (loading) {
    return <div style={{ padding: 20 }}>Chargement…</div>;
  }

  if (error) {
    return <div style={{ padding: 20 }}>Erreur : {error}</div>;
  }

  if (!profile) {
    return <div style={{ padding: 20 }}>Organisation introuvable</div>;
  }


  return (
    <WidgetRoot theme={theme}>
      <WidgetHeader title={`Prochains événements de ${profile.displayName}`}/>

      {upcomingEvents.length === 0 ? (
        <p>Aucun événement</p>
      ) : (
        <WidgetGrid>
          {upcomingEvents.map((e) => (
          <WidgetEventCard
            key={e.id}
            event={e}
            onClick={() =>
          navigate(`/widget/o/${orgSlug}/e/${e.slug}/billets${search}`)
          }/>
        ))} 
        </WidgetGrid> 
      )}

      {events && events.length > MAX_EVENTS && (
      <div className="widgetMoreEvents">
        <Button
        className="widgetButton"
          variant="secondary"
          label="Voir tous les événements"
          onClick={() =>
            window.open(`/o/${orgSlug}`, "_blank", "noopener,noreferrer")
          }
        />
      </div>
      )}
    <WidgetFooter/>
  </WidgetRoot>
  );
}