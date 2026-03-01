import type { AppError } from "../../domain/errors/errors";
import { createContext, useContext } from "react";


type GlobalNetworkErrorContextValue = {
  networkError: AppError | null;
  setNetworkError: (err: AppError | null) => void;
  clearNetworkError: () => void;
};

export function makeNetworkFallbackMessage(err: AppError) {
  return (
    err.message ||
    "Impossible de contacter le serveur. Vérifie ta connexion et réessaie."
  );
}

export const GlobalNetworkErrorContext =
  createContext<GlobalNetworkErrorContextValue | undefined>(undefined);


export function useGlobalNetworkError() {
  const ctx = useContext(GlobalNetworkErrorContext);
  if (!ctx) {
    throw new Error("useGlobalNetworkError doit être utilisé dans GlobalNetworkErrorProvider");
  }
  return ctx;
}
