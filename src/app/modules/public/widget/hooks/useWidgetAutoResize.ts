import { useEffect } from "react";
import { useLocation } from "react-router-dom";

function getWidgetHeight() {
  return Math.max(
    document.documentElement.scrollHeight,
    document.body.scrollHeight,
    document.documentElement.offsetHeight,
    document.body.offsetHeight,
    document.documentElement.clientHeight,
    document.body.clientHeight
  );
}

export function useWidgetAutoResize() {
  const location = useLocation();

  useEffect(() => {
    function postHeight() {
      const height = getWidgetHeight();

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

    const t1 = window.setTimeout(postHeight, 60);
    const t2 = window.setTimeout(postHeight, 250);
    const t3 = window.setTimeout(postHeight, 700);

    const observer = new ResizeObserver(() => {
      postHeight();
    });

    observer.observe(document.body);
    observer.observe(document.documentElement);

    window.addEventListener("load", postHeight);
    window.addEventListener("resize", postHeight);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      observer.disconnect();
      window.removeEventListener("load", postHeight);
      window.removeEventListener("resize", postHeight);
    };
  }, [location.pathname, location.search]);
}