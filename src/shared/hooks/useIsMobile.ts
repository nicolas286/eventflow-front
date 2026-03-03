import { useEffect, useState } from "react";

export function useIsMobile(maxWidthPx = 720) {
  const getMatch = () =>
    typeof window !== "undefined"
      ? window.matchMedia(`(max-width: ${maxWidthPx}px)`).matches
      : false;

  const [isMobile, setIsMobile] = useState(getMatch);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia(
      `(max-width: ${maxWidthPx}px)`
    );

    const handler = (e: MediaQueryListEvent) =>
      setIsMobile(e.matches);

    mediaQuery.addEventListener("change", handler);

    return () =>
      mediaQuery.removeEventListener("change", handler);
  }, [maxWidthPx]);

  return isMobile;
}


