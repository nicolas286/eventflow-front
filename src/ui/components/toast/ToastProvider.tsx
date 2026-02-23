import { useCallback, useMemo, useState, type ReactNode } from "react";
import type { Toast, ToastOptions } from "./toast.types";
import { ToastContext } from "./toast.context";
import { ToastViewport } from "./ToastViewPort";

function generateId() {
  return Math.random().toString(36).slice(2);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (options: ToastOptions) => {
      const id = generateId();

      const toast: Toast = {
        id,
        variant: "info",
        duration: 4000,
        ...options,
      };

      setToasts((prev) => [...prev, toast]);

      if ((toast.duration ?? 0) > 0) {
        setTimeout(() => removeToast(id), toast.duration);
      }
    },
    [removeToast]
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onClose={removeToast} />
    </ToastContext.Provider>
  );
}