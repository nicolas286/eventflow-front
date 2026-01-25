type FullScreenMessageProps = {
  message: string;
};

export function FullScreenMessage({ message }: FullScreenMessageProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-50">
      <div className="text-slate-300">{message}</div>
    </div>
  );
}
