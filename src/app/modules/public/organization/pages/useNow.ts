import { useEffect, useState } from "react";

export function useNow(intervalMs = 60_000) {
  const [nowTs, setNowTs] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNowTs(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);

  return nowTs;
}