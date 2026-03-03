import type { Toast } from "./toast.types";

export function ToastViewport({
  toasts,
  onClose,
}: {
  toasts: Toast[];
  onClose: (id: string) => void;
}) {
  return (
    <div className="toastViewport">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onClose={onClose} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onClose,
}: {
  toast: Toast;
  onClose: (id: string) => void;
}) {
  const v = toast.variant ?? "info";

  return (
    <div className={`toast toast--${v}`}>
      <div className="toast__content">
        {toast.title && <div className="toast__title">{toast.title}</div>}
        {toast.description && <div className="toast__description">{toast.description}</div>}
      </div>

      <button className="toast__close" type="button" onClick={() => onClose(toast.id)}>
        ✕
      </button>
    </div>
  );
}