import { useParams, useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import { supabase } from "@gateways/supabase/supabaseClient";
import { usePublicOrgData } from "../../organization/hooks/usePublicOrgData";
import { useWidgetTheme } from "../hooks/useWidgetTheme";
import { Button } from "@shared/ui/components";
import { useLocation } from "react-router-dom";

import "./WidgetOrgPage.css";
import { useWidgetAutoResize } from "../hooks/useWidgetAutoResize";

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
    <div
    id="eventflow-widget-root"
  className="widgetRoot"
  style={{
    "--widget-bg": theme.bg,
    "--widget-card": theme.card,
    "--widget-text": theme.text,
    "--widget-button": theme.button,
  } as React.CSSProperties}
>
  <h2>Prochains événements de {profile.displayName}</h2>

  {upcomingEvents.length === 0 ? (
    <p>Aucun événement</p>
  ) : (
    <div className="widgetEventsGrid">
      {upcomingEvents.map((e) => (
  <div
    key={e.id}
    className="widgetEventCard"
    onClick={() =>
      navigate(`/widget/o/${orgSlug}/e/${e.slug}/billets${search}`)
    }
  >
    <div className="widgetEventTitle">{e.title}</div>

    {e.startsAt && (
      <div style={{ fontSize: 13, opacity: 0.7 }}>
        {new Date(e.startsAt).toLocaleString("fr-BE", {
          dateStyle: "medium",
          timeStyle: "short",
        })}
      </div>
    )}

    {e.isSoldOut ? (
      <div style={{ fontSize: 13, fontWeight: 600, marginTop: 6 }}>
        Complet
      </div>
    ) : null}

    <Button
  label={e.isSoldOut ? "Complet" : "Billets"}
  disabled={e.isSoldOut}
  onClick={(ev) => {
    ev.stopPropagation();
    if (e.isSoldOut) return;
    navigate(`/widget/o/${orgSlug}/e/${e.slug}/billets${search}`);
  }}
/>
  </div>
))}
      
    </div>

    
  )}

  {events && events.length > MAX_EVENTS && (
  <div className="widgetMoreEvents">
    <Button
      variant="secondary"
      label="Voir tous les événements"
      onClick={() =>
        window.open(`/o/${orgSlug}`, "_blank")
      }
    />
  </div>
)}
<div className="widgetFooter">
  Billetterie par{" "}
  <a
    href="https://useeventflow.eu"
    target="_blank"
    rel="noopener noreferrer"
  >
    Eventflow
  </a>
</div>
</div>
  );
}