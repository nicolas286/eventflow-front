import { Outlet } from "react-router-dom";
import PublicFooter from "@ui/components/publicFooter/PublicFooter";
import "./PublicLayout.css";

export function PublicShellLayout() {
  return (
    <div className="publicShellRoot">
      <main className="publicShellMain">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
}
