import "./WidgetGrid.css";

type Props = {
    children: React.ReactNode; 
}

export function WidgetGrid({children} : Props){
    return (
        <div className="widgetGrid">{children}</div>
    )
}