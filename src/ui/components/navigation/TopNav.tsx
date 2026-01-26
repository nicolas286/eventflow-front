import type { ReactNode } from "react";
import "../../../styles/topNav.css";

import HamburgerMenu, {
  MenuDivider,
  MenuHeader,
  MenuItem,
  MenuToggle,
} from "../menus/HamburgerMenu";

export type OrgInfo = {
  name?: string;
  logoUrl?: string;
};

export type TopNavMode = "public" | "admin";

export type TopNavProps = {
  org?: OrgInfo | null;
  mode: TopNavMode;
  onToggleMode?: () => void;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
};


export default function TopNav({
  org,
  mode,
  onToggleMode,
  darkMode,
  onToggleDarkMode,
}: TopNavProps) {
  const title = org?.name ?? "Billetterie";
  const subtitle: ReactNode = mode === "public" ? "Espace public" : "Espace admin";

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

              <MenuItem
                label={mode === "public" ? "Passer en admin" : "Passer en public"}
                hint={mode === "public" ? "Gestion billetterie" : "Vue utilisateur"}
                onClick={() => {
                  onToggleMode?.();
                  close();
                }}
              />

              <MenuDivider />

              <MenuToggle
                label="Mode sombre"
                value={!!darkMode}
                onToggle={() => onToggleDarkMode?.()}
              />
            </>
          )}
        </HamburgerMenu>
      </div>
    </header>
  );
}