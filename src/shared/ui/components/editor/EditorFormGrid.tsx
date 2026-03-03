import type React from "react";
import "./editorFormGrid.css";

export type EditorNode = {
  key: string;
  label?: React.ReactNode;
  span2?: boolean;
  hidden?: boolean;
  element: React.ReactNode;
};

export function EditorFormGrid({ nodes }: { nodes: EditorNode[] }) {
  return (
    <div className="formGrid editorFormGrid">
      {nodes
        .filter((n) => !n.hidden)
        .map((n) => (
          <div
            key={n.key}
            className={`eventField${n.span2 ? " eventFieldSpan2" : ""}`}
          >
            {n.label ? <div className="eventLabel">{n.label}</div> : null}
            {n.element}
          </div>
        ))}
    </div>
  );
}