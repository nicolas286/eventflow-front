import { useEffect } from "react";
import { useLocation } from "react-router-dom";

function getWidgetContentHeight() {
  const root = document.getElementById("eventflow-widget-root");

  if (root) {
    return Math.ceil(root.getBoundingClientRect().height);
  }

  return Math.ceil(
    Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight
    )
  );
}

export function useWidgetAutoResize() {
  const location = useLocation();

  useEffect(() => {
    function postHeight() {
      const height = getWidgetContentHeight();

      console.log("[widget] resize ->", height);

      window.parent.postMessage(
        {
          type: "eventflow:widget:resize",
          height,
        },
        "*"
      );
    }

    postHeight();

    const t1 = window.setTimeout(postHeight, 50);
    const t2 = window.setTimeout(postHeight, 180);
    const t3 = window.setTimeout(postHeight, 500);

    const observer = new ResizeObserver(() => {
      postHeight();
    });

    const root = document.getElementById("eventflow-widget-root");
    if (root) observer.observe(root);

    window.addEventListener("resize", postHeight);
    window.addEventListener("load", postHeight);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      observer.disconnect();
      window.removeEventListener("resize", postHeight);
      window.removeEventListener("load", postHeight);
    };
  }, [location.pathname, location.search]);
}