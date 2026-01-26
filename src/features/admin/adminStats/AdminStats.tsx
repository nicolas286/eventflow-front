import "../../../styles/adminStats.css"
import { Card, CardBody } from "../../../ui/components";

type Stats = {
  active: number;
  open: number;
  soldout: number;
};

type AdminStatsProps = {
  stats: Stats;
};

export default function AdminStats({ stats }: AdminStatsProps) {
  return (
    <div className="adminStats">
      <Card><CardBody><Stat label="Événements actifs" value={stats.active} /></CardBody></Card>
      <Card><CardBody><Stat label="Ouverts" value={stats.open} /></CardBody></Card>
      <Card><CardBody><Stat label="Complets" value={stats.soldout} /></CardBody></Card>
    </div>
  );
}

type StatProps = {
  label: string;
  value: number;
};

function Stat({ label, value }: StatProps) {
  return (
    <div className="adminStats__stat">
      <div className="adminStats__label">{label}</div>
      <div className="adminStats__value">{value}</div>
    </div>
  );
}