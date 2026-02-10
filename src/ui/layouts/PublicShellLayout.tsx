import { Outlet } from "react-router-dom";
import PublicFooter from "../components/publicFooter/PublicFooter";
import "../../styles/desktop/publicLayout.css";

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
