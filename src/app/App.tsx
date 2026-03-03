
import { AppRoutes } from "./routes/AppRoutes";

import { ToastProvider } from "@shared/ui/components/toast/ToastProvider";
import "@ui/components/toast/toast.css";

function App() {
  return (
    <ToastProvider>
      <AppRoutes/>
    </ToastProvider>
  );
}

export default App;
