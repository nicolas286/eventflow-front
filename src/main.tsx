import React from "react";
import ReactDOM from "react-dom/client";
import App from "@app/App";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./providers/AuthProvider/AuthProvider";
import { GlobalNetworkErrorProvider } from "./providers/GlobalNetworkErrorProvider/GlobalNetworkErrorProvider";
import { HelmetProvider } from "react-helmet-async";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
     <GlobalNetworkErrorProvider>
      <AuthProvider>   
        <HelmetProvider>
          <App />
        </HelmetProvider>
      </AuthProvider>
    </GlobalNetworkErrorProvider>
    </BrowserRouter>
  </React.StrictMode>
);
