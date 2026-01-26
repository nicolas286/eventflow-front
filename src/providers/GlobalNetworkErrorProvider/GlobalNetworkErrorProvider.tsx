import { useState, type ReactNode } from "react";
import type { AppError } from "../../domain/errors/errors";
import { FullScreenMessage } from "../../ui/components/FullScreenMessage";
import { makeNetworkFallbackMessage, GlobalNetworkErrorContext } from "./GlobalNetworkErrorProviderHook";



export function GlobalNetworkErrorProvider({ children }: { children: ReactNode }) {
  const [networkError, setNetworkError] = useState<AppError | null>(null);
  const clearNetworkError = () => setNetworkError(null);

  if (networkError?.code === "NETWORK") {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full space-y-4">
          <FullScreenMessage message={makeNetworkFallbackMessage(networkError)} />
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className="text-sm px-3 py-2 rounded-md bg-slate-700 hover:bg-slate-600"
              onClick={clearNetworkError}
            >
              Fermer
            </button>
            <button
              type="button"
              className="text-sm px-3 py-2 rounded-md bg-slate-50 text-slate-900 hover:bg-slate-200"
              onClick={() => window.location.reload()}
            >
              Recharger
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <GlobalNetworkErrorContext.Provider
      value={{ networkError, setNetworkError, clearNetworkError }}
    >
      {children}
    </GlobalNetworkErrorContext.Provider>
  );
}


