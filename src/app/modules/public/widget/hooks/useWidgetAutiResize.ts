import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export function useWidgetAutoResize() {
  const location = useLocation();

  useEffect(() => {
    function postHeight() {
      const height = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight
      );

      window.parent.postMessage(
        {
          type: "eventflow:widget:resize",
          height,
        },
        "*"
      );
    }

    const timeout = window.setTimeout(postHeight, 60);
    const timeout2 = window.setTimeout(postHeight, 250);

    const observer = new ResizeObserver(() => {
      postHeight();
    });

    observer.observe(document.body);

    window.addEventListener("load", postHeight);
    window.addEventListener("resize", postHeight);

    return () => {
      clearTimeout(timeout);
      clearTimeout(timeout2);
      observer.disconnect();
      window.removeEventListener("load", postHeight);
      window.removeEventListener("resize", postHeight);
    };
  }, [location.pathname, location.search]);
}