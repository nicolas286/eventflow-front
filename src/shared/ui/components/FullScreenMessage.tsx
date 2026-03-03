type FullScreenMessageProps = {
  message: string;
};

export function FullScreenMessage({ message }: FullScreenMessageProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900">
      <div className="text-slate-900">{message}</div>
    </div>
  );
}
