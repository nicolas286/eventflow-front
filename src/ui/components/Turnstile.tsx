import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "compact" | "invisible";
          appearance?: "always" | "execute" | "interaction-only";
          tabindex?: number;
          retry?: "auto" | "never";
          "refresh-expired"?: "auto" | "manual";
          callback?: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          "timeout-callback"?: () => void;
        }
      ) => string;
      execute: (widgetId: string) => void;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

type Props = {
  siteKey: string;
  onToken: (token: string | null) => void;
  onError?: () => void;
  onExpired?: () => void;

  /** Invisible par défaut (recommandé) */
  size?: "normal" | "compact" | "invisible";
  theme?: "light" | "dark" | "auto";

  /** Si true, exécute automatiquement au render */
  autoExecute?: boolean;

  className?: string;
};

/**
 * Turnstile (Cloudflare) - version sans dépendance
 * - rend un widget
 * - renvoie token via onToken
 * - expose execute/reset via refs internes (voir usage plus bas)
 */
export default function Turnstile({
  siteKey,
  onToken,
  onError,
  onExpired,
  size = "invisible",
  theme = "auto",
  autoExecute = true,
  className = "",
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [ready, setReady] = useState(false);

  // 1) load script (une seule fois)
  useEffect(() => {
    if (window.turnstile) {
      setReady(true);
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(
      'script[src^="https://challenges.cloudflare.com/turnstile/v0/api.js"]'
    );
    if (existing) {
      // attend que ça soit prêt
      const t = setInterval(() => {
        if (window.turnstile) {
          clearInterval(t);
          setReady(true);
        }
      }, 50);
      return () => clearInterval(t);
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

    return () => {
      // on ne retire pas le script global (ça évite les glitches si plusieurs pages)
    };
  }, [onError]);

  // 2) render widget
  useEffect(() => {
    const el = containerRef.current;
    if (!ready || !el || !window.turnstile) return;

    // si déjà rendu, clean
    if (widgetIdRef.current) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch {}
      widgetIdRef.current = null;
    }

    const widgetId = window.turnstile.render(el, {
      sitekey: siteKey,
      theme,
      size,
      // pour invisible: le token arrive via callback après execute()
      callback: (token: string) => onToken(token),
      "error-callback": () => {
        onToken(null);
        onError?.();
      },
      "expired-callback": () => {
        onToken(null);
        onExpired?.();
      },
      "timeout-callback": () => {
        onToken(null);
        onError?.();
      },
      // "refresh-expired": "auto", // optionnel
    });

    widgetIdRef.current = widgetId;

    if (autoExecute && size === "invisible") {
      // exécute automatiquement pour obtenir un token
      try {
        window.turnstile.execute(widgetId);
      } catch {
        // ignore
      }
    }

    return () => {
      if (widgetIdRef.current) {
        try {
          const ts = window.turnstile;
            if (ts && widgetIdRef.current) {
            try {
                ts.remove(widgetIdRef.current);
            } catch {}
            }

        } catch {}
        widgetIdRef.current = null;
      }
    };
  }, [ready, siteKey, theme, size, autoExecute, onToken, onError, onExpired]);

  // helpers (optionnel) : expose via window pour debug rapide
  useEffect(() => {
    // @ts-ignore
    window.__turnstile_widget_id__ = widgetIdRef.current;
  }, [ready]);

  return <div ref={containerRef} className={className} />;
}
