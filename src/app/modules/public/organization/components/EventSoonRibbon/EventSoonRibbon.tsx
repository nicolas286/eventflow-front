import "./EventSoonRibbon.css";

type EventSoonRibbonProps = {
  label: string;
  type: "start" | "deadline";
};

export function EventSoonRibbon({ label, type }: EventSoonRibbonProps) {
  return (
    <div className={`eventSoonRibbon ${type}`} aria-label={label}>
      <span className="eventSoonRibbonDot" />
      {label}
    </div>
  );
}