import "./WidgetFooter.css"; 

export function WidgetFooter() {
    return (
        <div className="widgetFooter">
        Billetterie par{" "}
            <a
                href="https://useeventflow.eu"
                target="_blank"
                rel="noopener noreferrer"
            >
                Eventflow
            </a>
        </div>
    );
}