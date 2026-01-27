import "../../../styles/adminStats.css"
import { Card, CardBody } from "../../../ui/components";

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
      {/* DESKTOP / TABLETTE */}
      <div className="adminStats adminStatsDesktop">
        <Card><CardBody><Stat label="Événements créés" value={stats.totalEvents} /></CardBody></Card>
        <Card><CardBody><Stat label="Événements publiés" value={stats.publishedEvents} /></CardBody></Card>
        <Card><CardBody><Stat label="Brouillons" value={stats.draftEvents} /></CardBody></Card>
      </div>

      {/* MOBILE */}
      <div className="adminStatsMobile">
        <Card>
          <CardBody className="adminStatsMobileBody">
            <div className="adminStatsBar">
              <InlineStat label="Créés" value={stats.totalEvents} />
              <Divider />
              <InlineStat label="Publiés" value={stats.publishedEvents} />
              <Divider />
              <InlineStat label="Brouillons" value={stats.draftEvents} />
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}

function InlineStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="adminStatsItem">
      <div className="adminStatsItem__value">{value}</div>
      <div className="adminStatsItem__label">{label}</div>
    </div>
  );
}

function Divider() {
  return <div className="adminStatsDivider" aria-hidden />;
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