type StatProps = {
  label: string;
  value: number;
};

export function StatCard({ label, value }: StatProps) {
  return (
    <div className="adminStats__stat">
      <div className="adminStats__label">{label}</div>
      <div className="adminStats__value">{value}</div>
    </div>
  );
}