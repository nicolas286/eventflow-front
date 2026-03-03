import { createContext } from "react";
import type { ToastOptions } from "./toast.types";

export type ToastContextValue = {
  showToast: (options: ToastOptions) => void;
};

export const ToastContext = createContext<ToastContextValue | null>(null);