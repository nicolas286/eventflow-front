// src/ui/components/security/Turnstile.tsx
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

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
  size?: "normal" | "compact" | "invisible";
  className?: string;
};

export const Turnstile = forwardRef<TurnstileRef, Props>(function Turnstile(
  { siteKey, onToken, onError, onExpired, theme = "auto", size = "invisible", className = "" },
  ref
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [ready, setReady] = useState(false);

  // Load script once
  useEffect(() => {
    if (window.turnstile) {
      setReady(true);
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(
      'script[src^="https://challenges.cloudflare.com/turnstile/v0/api.js"]'
    );
    if (existing) {
      const t = window.setInterval(() => {
        if (window.turnstile) {
          window.clearInterval(t);
          setReady(true);
        }
      }, 50);
      return () => window.clearInterval(t);
    }

    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.defer = true;
    s.onload = () => setReady(true);
    s.onerror = () => {
      onError?.();
      setReady(false);
    };
    document.head.appendChild(s);
  }, [onError]);

  // Render widget once ready
  useEffect(() => {
    const el = containerRef.current;
    const ts = window.turnstile;
    if (!ready || !el || !ts) return;

    // Clean previous widget if any
    if (widgetIdRef.current) {
      try {
        ts.remove(widgetIdRef.current);
      } catch {}
      widgetIdRef.current = null;
    }

    const widgetId = ts.render(el, {
      sitekey: siteKey,
      theme,
      size,
      callback: (token: string) => onToken(token),
      "error-callback": () => onError?.(),
      "expired-callback": () => onExpired?.(),
      "timeout-callback": () => onError?.(),
    });

    widgetIdRef.current = widgetId;

    return () => {
      const tsCleanup = window.turnstile;
      if (tsCleanup && widgetIdRef.current) {
        try {
          tsCleanup.remove(widgetIdRef.current);
        } catch {}
        widgetIdRef.current = null;
      }
    };
  }, [ready, siteKey, theme, size, onToken, onError, onExpired]);

  useImperativeHandle(ref, () => ({
    execute() {
      const ts = window.turnstile;
      const id = widgetIdRef.current;
      if (!ts || !id) return;
      try {
        // reset avant execute pour éviter "already executing"
        ts.reset(id);
      } catch {}
      try {
        ts.execute(id);
      } catch {
        onError?.();
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
