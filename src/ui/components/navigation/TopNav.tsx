import type { ReactNode } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../../styles/topNav.css";

import HamburgerMenu, {
  MenuDivider,
  MenuHeader,
  MenuItem,
} from "../menus/HamburgerMenu";

import { supabase } from "../../../gateways/supabase/supabaseClient";

export type OrgInfo = {
  name?: string;
  logoUrl?: string;
};

export type TopNavMode = "public" | "admin";
export type AdminNavKey =
  | "event"
  | "branding"
  | "structure"
  | "profil"
  | "abonnement";

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

export default function TopNav({ org, mode }: TopNavProps) {
  const navigate = useNavigate();

  const [loggingOut, setLoggingOut] = useState(false);

  const title = org?.name ?? "Billetterie";
  const subtitle: ReactNode =
    mode === "public" ? "Espace public" : "Espace admin";

  const go = (key: AdminNavKey, close: () => void) => {
    if (loggingOut) return;
    navigate(adminKeyToPath[key]);
    close();
  };

  async function handleLogout(close: () => void) {
    if (loggingOut) return;

    setLoggingOut(true);

    // ferme le menu tout de suite
    close();

    // petite transition (si tu ajoutes un effet CSS sur body / app root, sinon c'est juste un délai)
    await new Promise((r) => setTimeout(r, 200));

    await supabase.auth.signOut();

    // redirige vers ta page publique (adapte si tu as /login)
    navigate("/");
  }

  return (
    <header className="topNav">
      <div className="topNav__inner">
        <div className="topNav__left">
          {org?.logoUrl ? (
            <img className="topNav__logo" src={org.logoUrl} alt="Logo" />
          ) : (
            <div className="topNav__logoFallback">
              {(title?.[0] || "A").toUpperCase()}
            </div>
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
                  <MenuItem
                    label="Mes événements"
                    onClick={() => go("event", close)}
                  />
                  <MenuItem
                    label="Apparence"
                    onClick={() => go("branding", close)}
                  />
                  <MenuItem
                    label="Profil d'organisateur"
                    onClick={() => go("structure", close)}
                  />
                  <MenuItem
                    label="Profil personnel"
                    onClick={() => go("profil", close)}
                  />
                  <MenuItem
                    label="Mon abonnement"
                    onClick={() => go("abonnement", close)}
                  />
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
