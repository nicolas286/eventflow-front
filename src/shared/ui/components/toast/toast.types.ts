export type ToastVariant = "success" | "error" | "info" | "warning";

export type ToastOptions = {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number; // ms (0 = sticky)
};

export type Toast = ToastOptions & {
  id: string;
};