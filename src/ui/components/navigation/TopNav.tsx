import type { ReactNode } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../../styles/desktop/topNav.desktop.css";
import "../../../styles/mobile/topNav.mobile.css";

import HamburgerMenu, { MenuDivider, MenuHeader, MenuItem } from "../menus/HamburgerMenu";
import { supabase } from "../../../gateways/supabase/supabaseClient";

export type OrgInfo = {
  name?: string;
  logoUrl?: string;
  slug?: string;
};

export type TopNavMode = "public" | "admin";
export type AdminNavKey = "event" | "branding" | "structure" | "profil" | "abonnement";

export type TopNavProps = {
  org?: OrgInfo | null;
  mode: TopNavMode;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
};

const adminKeyToPath: Record<AdminNavKey, string> = {
  event: "/admin/events",
  branding: "/admin/branding",
  structure: "/admin/structure",
  profil: "/admin/profil",
  abonnement: "/admin/abonnement",
};

// slugify simple basé sur le nom (tu peux remplacer par ton vrai slug/orgId si tu l’as)
function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * 🔁 ADAPTE ICI si ton routing public est différent
 * Exemples possibles:
 * - return `/o/${org.slug}`
 * - return `/org/${orgId}`
 * - return `/public/${orgId}`
 */
function getPublicPath(org?: OrgInfo | null) {
  if (!org) return "/";

  if (org.slug && org.slug.trim()) {
    return `/o/${org.slug.trim()}`;
  }

  const name = org.name?.trim();
  if (!name) return "/";

  return `/o/${slugify(name)}`;
}

export default function TopNav({ org, mode }: TopNavProps) {
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  const title = org?.name ?? "Billetterie";
  const subtitle: ReactNode = mode === "public" ? "Espace public" : "Espace admin";

  const go = (key: AdminNavKey, close: () => void) => {
    if (loggingOut) return;
    navigate(adminKeyToPath[key]);
    close();
  };

  const goPublic = (close?: () => void) => {
    if (loggingOut) return;
    navigate(getPublicPath(org));
    close?.();
  };

  async function copyPublicUrl(close?: () => void) {
  if (!org) return;

  const path = getPublicPath(org);
  const fullUrl = `${window.location.origin}${path}`;

  try {
    await navigator.clipboard.writeText(fullUrl);
    console.log("URL copiée :", fullUrl);
  } catch (err) {
    console.error("Erreur copie presse-papier", err);
  }

  close?.();
}

  async function handleLogout(close: () => void) {
    if (loggingOut) return;

    setLoggingOut(true);
    close();

    await new Promise((r) => setTimeout(r, 200));
    await supabase.auth.signOut();

    navigate("/");
  }

  const onLogoClick = () => {
    // ✅ clic logo => page publique
    goPublic();
  };

  return (
    <header className="topNav">
      <div className="topNav__inner">
        <div
          className="topNav__left"
          role="button"
          tabIndex={0}
          onClick={onLogoClick}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") onLogoClick();
          }}
          style={{ cursor: "pointer" }}
          aria-label="Aller à la page publique"
          title="Voir la page publique"
        >
          {org?.logoUrl ? (
            <img className="topNav__logo" src={org.logoUrl} alt="Logo" />
          ) : (
            <div className="topNav__logoFallback">{(title?.[0] || "A").toUpperCase()}</div>
          )}

          <div className="topNav__titles">
            <div className="topNav__title">{title}</div>
            <div className="topNav__subtitle">{subtitle}</div>
          </div>
        </div>

        <HamburgerMenu>
          {(close) => (
            <>
              <MenuHeader>Menu</MenuHeader>

              {mode === "admin" ? (
                <>
                  {/* ✅ lien vers le public */}
                  <MenuItem label="Voir le profil public" onClick={() => goPublic(close)} />
                  <MenuItem
                      label="Copier l’adresse du profil public"
                      onClick={() => copyPublicUrl(close)}
                    />

                  <MenuDivider />

                  <MenuItem label="Mes événements" onClick={() => go("event", close)} />
                  <MenuItem label="Apparence" onClick={() => go("branding", close)} />
                  <MenuItem label="Profil d'organisateur" onClick={() => go("structure", close)} />
                  <MenuItem label="Profil personnel" onClick={() => go("profil", close)} />
                  <MenuItem label="Mon abonnement" onClick={() => go("abonnement", close)} />

                  <MenuDivider />
                  <MenuItem
                    label={loggingOut ? "Déconnexion…" : "Se déconnecter"}
                    onClick={() => void handleLogout(close)}
                  />
                </>
              ) : null}
            </>
          )}
        </HamburgerMenu>
      </div>
    </header>
  );
}
