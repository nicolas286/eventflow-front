import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, any>) => string;
      execute: (widgetId: string) => void;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

export type TurnstileRef = {
  execute: () => void;
  reset: () => void;
};

type Props = {
  siteKey: string;
  onToken: (token: string) => void;
  onError?: () => void;
  onExpired?: () => void;
  theme?: "light" | "dark" | "auto";
  size?: "normal" | "compact" | "flexible";
  className?: string;
};

export const Turnstile = forwardRef<TurnstileRef, Props>(function Turnstile(
  {
    siteKey,
    onToken,
    onError,
    onExpired,
    theme = "auto",
    size = "normal",
    className = "",
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);

  const onTokenRef = useRef(onToken);
  const onErrorRef = useRef(onError);
  const onExpiredRef = useRef(onExpired);

  // Sync callback refs
  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    onExpiredRef.current = onExpired;
  }, [onExpired]);

  // Load script once
  useEffect(() => {
    if (window.turnstile) return;

    const existing = document.querySelector<HTMLScriptElement>(
      'script[src^="https://challenges.cloudflare.com/turnstile/v0/api.js"]'
    );

    if (existing) return;

    const script = document.createElement("script");
    script.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;

    script.onerror = () => {
      onErrorRef.current?.();
    };

    document.head.appendChild(script);
  }, []);

  // Render widget once
  useEffect(() => {
    const interval = setInterval(() => {
      const el = containerRef.current;
      const ts = window.turnstile;

      if (!el || !ts) return;

      if (widgetIdRef.current) return;

      const widgetId = ts.render(el, {
        sitekey: siteKey,
        theme,
        size,
        callback: (token: string) => onTokenRef.current?.(token),
        "error-callback": () => onErrorRef.current?.(),
        "expired-callback": () => onExpiredRef.current?.(),
      });

      widgetIdRef.current = widgetId;
      clearInterval(interval);
    }, 50);

    return () => {
      clearInterval(interval);

      if (window.turnstile && widgetIdRef.current) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {}
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, theme, size]);

  useImperativeHandle(ref, () => ({
    execute() {
      const ts = window.turnstile;
      const id = widgetIdRef.current;
      if (!ts || !id) return;

      try {
        ts.reset(id);
      } catch {}

      try {
        ts.execute(id);
      } catch {
        onErrorRef.current?.();
      }
    },
    reset() {
      const ts = window.turnstile;
      const id = widgetIdRef.current;
      if (!ts || !id) return;

      try {
        ts.reset(id);
      } catch {}
    },
  }));

  return <div ref={containerRef} className={className} />;
});
