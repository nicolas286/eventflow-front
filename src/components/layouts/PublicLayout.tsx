import { Outlet } from "react-router-dom";

export function PublicLayout() {
  return (
    <div>
      {/* header public plus tard */}
      <Outlet />
    </div>
  );
}
