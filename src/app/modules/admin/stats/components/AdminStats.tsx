import "./adminStats.desktop.css";
import { Card, CardBody } from "@ui/components";
import { StatCard } from "./StatCard";

type Stats = {
  totalEvents: number;
  publishedEvents: number;
  draftEvents: number;
};

type AdminStatsProps = {
  stats: Stats;
};

export default function AdminStats({ stats }: AdminStatsProps) {
  return (
    <>
      <div className="adminStats adminStatsDesktop">
        <Card><CardBody><StatCard label="Événements créés" value={stats.totalEvents} /></CardBody></Card>
        <Card><CardBody><StatCard label="Événements publiés" value={stats.publishedEvents} /></CardBody></Card>
        <Card><CardBody><StatCard label="Brouillons" value={stats.draftEvents} /></CardBody></Card>
      </div>
    </>
  );
}

