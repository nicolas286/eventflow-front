import "./WidgetGrid.css";

type Props = {
  children: React.ReactNode;
  layout?: "grid" | "carousel";
};

export function WidgetGrid({
  children,
  layout = "grid",
}: Props) {
  return (
    <div
      className={`widgetGrid ${
        layout === "carousel"
          ? "widgetGridCarousel"
          : "widgetGridDefault"
      }`}
    >
      {children}
    </div>
  );
}