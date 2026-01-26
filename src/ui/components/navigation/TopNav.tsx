import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import "../../../styles/topNav.css";

import HamburgerMenu, { MenuDivider, MenuHeader, MenuItem, MenuToggle } from "../menus/HamburgerMenu";

export type OrgInfo = {
  name?: string;
  logoUrl?: string;
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

export default function TopNav({ org, mode, darkMode, onToggleDarkMode }: TopNavProps) {
  const navigate = useNavigate();

  const title = org?.name ?? "Billetterie";
  const subtitle: ReactNode = mode === "public" ? "Espace public" : "Espace admin";

  const go = (key: AdminNavKey, close: () => void) => {
    navigate(adminKeyToPath[key]);
    close();
  };

  return (
    <header className="topNav">
      <div className="topNav__inner">
        <div className="topNav__left">
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
                  <MenuItem label="event" onClick={() => go("event", close)} />
                  <MenuItem label="branding" onClick={() => go("branding", close)} />
                  <MenuItem label="structure" onClick={() => go("structure", close)} />
                  <MenuItem label="profil" onClick={() => go("profil", close)} />
                  <MenuItem label="abonnement" onClick={() => go("abonnement", close)} />
                  <MenuDivider />
                </>
              ) : null}

              <MenuToggle label="Mode sombre" value={!!darkMode} onToggle={() => onToggleDarkMode?.()} />
            </>
          )}
        </HamburgerMenu>
      </div>
    </header>
  );
}
