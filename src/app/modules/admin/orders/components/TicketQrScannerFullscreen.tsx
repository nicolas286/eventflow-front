import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { createPortal } from "react-dom";

import "./ticketQrScannerFullscreen.css";

/* --------- 📦 Types -------- */

export type ScannedTicketPreview = {
  ticketId: string;
  orderId: string;
  ticketIndex: number;
  qrToken: string;
  status: string;
  checkedInAt: string | null;
  checkedInBy?: string;
  productNameSnapshot?: string;
};

export type TicketQrScanOutcome =
  | {
      kind: "validated";
      ticket: ScannedTicketPreview;
    }
  | {
      kind: "alreadyChecked";
      ticket: ScannedTicketPreview;
    }
  | {
      kind: "invalid";
    }
  | {
      kind: "error";
      message: string;
    };

type FeedbackState =
  | {
      tone: "success" | "warning" | "error";
      title: string;
      subtitle?: string;
    }
  | null;

type TicketQrScannerFullscreenProps = {
  open: boolean;
  onClose: () => void;
  onScanToken: (qrToken: string) => Promise<TicketQrScanOutcome>;
  feedbackDurationMs?: number;
};

function formatCheckedInAt(value: string | null): string | null {
  if (!value) return null;

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  return new Intl.DateTimeFormat("fr-BE", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(d);
}

/* --------- 📦 Component -------- */

export function TicketQrScannerFullscreen({
  open,
  onClose,
  onScanToken,
  feedbackDurationMs = 2500,
}: TicketQrScannerFullscreenProps) {
  const rawId = useId();
  const scannerId = useMemo(
    () => `ticket-qr-reader-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`,
    [rawId],
  );

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const mountedRef = useRef(false);
  const processingRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const lockedTokenRef = useRef<string | null>(null);
  const outcomeEpochRef = useRef(0);

  const onScanTokenRef = useRef(onScanToken);
  const handleDecodedRef = useRef<(decodedText: string) => void>(() => {});
  const showFeedbackRef = useRef<(next: NonNullable<FeedbackState>) => void>(() => {});

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  useEffect(() => {
    onScanTokenRef.current = onScanToken;
  }, [onScanToken]);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const resumeScanner = useCallback(() => {
    processingRef.current = false;
    setFeedback(null);

    try {
      scannerRef.current?.resume();
    } catch {
      // ignore
    }
  }, []);

  const dismissFeedback = useCallback(() => {
    clearTimer();
    outcomeEpochRef.current += 1;
    resumeScanner();
  }, [clearTimer, resumeScanner]);

  const showFeedback = useCallback(
    (next: NonNullable<FeedbackState>) => {
      clearTimer();
      setFeedback(next);

      timerRef.current = window.setTimeout(() => {
        resumeScanner();
      }, feedbackDurationMs);
    },
    [clearTimer, feedbackDurationMs, resumeScanner],
  );

  useEffect(() => {
    showFeedbackRef.current = showFeedback;
  }, [showFeedback]);

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;

    try {
      await scanner.stop();
    } catch {
      // ignore
    }

    try {
      await scanner.clear();
    } catch {
      // ignore
    }

    scannerRef.current = null;
  }, []);

  useEffect(() => {
    handleDecodedRef.current = async (decodedText: string) => {
      const qrToken = decodedText.trim();

      if (!qrToken || processingRef.current) return;

      if (lockedTokenRef.current === qrToken) {
        return;
      }

      processingRef.current = true;
      lockedTokenRef.current = qrToken;

      const epochAtStart = outcomeEpochRef.current;

      try {
        try {
          scannerRef.current?.pause(true);
        } catch {
          // ignore
        }

        const outcome = await onScanTokenRef.current(qrToken);

        if (!mountedRef.current) return;
        if (epochAtStart !== outcomeEpochRef.current) return;

        if (outcome.kind === "validated") {
          showFeedbackRef.current({
            tone: "success",
            title: "Ticket validé",
            subtitle: outcome.ticket.productNameSnapshot
              ? `${outcome.ticket.productNameSnapshot} · #${outcome.ticket.ticketIndex}`
              : `Ticket #${outcome.ticket.ticketIndex}`,
          });
          return;
        }

        if (outcome.kind === "alreadyChecked") {
          const formatted = formatCheckedInAt(outcome.ticket.checkedInAt);

          showFeedbackRef.current({
            tone: "warning",
            title: "Déjà scanné",
            subtitle: formatted ? `Déjà validé le ${formatted}` : "Ce ticket a déjà été utilisé",
          });
          return;
        }

        if (outcome.kind === "error") {
          showFeedbackRef.current({
            tone: "error",
            title: "Erreur de validation",
            subtitle: outcome.message,
          });
          return;
        }

        showFeedbackRef.current({
          tone: "error",
          title: "Ticket invalide",
          subtitle: "QR code inconnu pour cet événement",
        });
      } catch {
        if (!mountedRef.current) return;
        if (epochAtStart !== outcomeEpochRef.current) return;

        showFeedbackRef.current({
          tone: "error",
          title: "Ticket invalide",
          subtitle: "Impossible de traiter ce QR code",
        });
      }
    };
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!open) {
      clearTimer();
      setFeedback(null);
      setCameraError(null);
      setStarting(false);
      processingRef.current = false;
      lockedTokenRef.current = null;
      outcomeEpochRef.current += 1;
      void stopScanner();
      return;
    }

    let cancelled = false;

    async function boot() {
      setStarting(true);
      setCameraError(null);

      const scanner = new Html5Qrcode(scannerId, {
        verbose: false,
      });

      scannerRef.current = scanner;

      try {
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 15,
            qrbox: (vw, vh) => {
              const size = Math.floor(Math.min(vw, vh) * 0.82);
              return { width: size, height: size };
            },
            disableFlip: false,
          },
          (decodedText) => {
            void handleDecodedRef.current(decodedText);
          },
          () => {
            // ignore
          },
        );
      } catch {
        try {
          await scanner.start(
            { facingMode: "environment" },
            {
              fps: 12,
              qrbox: (vw, vh) => {
                const size = Math.floor(Math.min(vw, vh) * 0.68);
                return { width: size, height: size };
              },
            },
            (decodedText) => {
              void handleDecodedRef.current(decodedText);
            },
            () => {
              // ignore
            },
          );
        } catch (e: unknown) {
          if (!cancelled && mountedRef.current) {
            setCameraError(
              e instanceof Error
                ? e.message
                : "Impossible d’ouvrir la caméra. Vérifie les permissions du navigateur.",
            );
          }
        }
      } finally {
        if (!cancelled && mountedRef.current) {
          setStarting(false);
        }
      }

      if (cancelled) {
        try {
          await scanner.stop();
        } catch {
          // ignore
        }
        try {
          await scanner.clear();
        } catch {
          // ignore
        }
        if (scannerRef.current === scanner) {
          scannerRef.current = null;
        }
      }
    }

    void boot();

    return () => {
      cancelled = true;
      clearTimer();
      setStarting(false);
      processingRef.current = false;
      lockedTokenRef.current = null;
      outcomeEpochRef.current += 1;
      void stopScanner();
    };
  }, [open, scannerId, clearTimer, stopScanner]);

  if (!open) return null;

  return createPortal(
    <div className="ticketQrScannerFs" role="dialog" aria-modal="true" aria-label="Scanner QR code">
      <div className="ticketQrScannerFs__readerWrap">
        <div id={scannerId} className="ticketQrScannerFs__reader" />
      </div>

      {!feedback ? (
        <>
          <div className="ticketQrScannerFs__topBar">
            <button
              type="button"
              className="ticketQrScannerFs__iconBtn"
              onClick={onClose}
              aria-label="Fermer le scanner"
            >
              ✕
            </button>
          </div>

          <div className="ticketQrScannerFs__overlay">
            <div className="ticketQrScannerFs__frame" />
          </div>

          <div className="ticketQrScannerFs__bottomHud">
            <div className="ticketQrScannerFs__hint">
              {starting
                ? "Ouverture de la caméra…"
                : cameraError
                  ? "Caméra indisponible"
                  : "Cadre le QR code pour valider rapidement"}
            </div>

            {cameraError ? <div className="ticketQrScannerFs__cameraError">{cameraError}</div> : null}
          </div>
        </>
      ) : (
        <div
          className={[
            "ticketQrScannerFs__feedback",
            feedback.tone === "success" && "ticketQrScannerFs__feedback--success",
            feedback.tone === "warning" && "ticketQrScannerFs__feedback--warning",
            feedback.tone === "error" && "ticketQrScannerFs__feedback--error",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <button
            type="button"
            className="ticketQrScannerFs__iconBtn ticketQrScannerFs__feedbackClose"
            onClick={dismissFeedback}
            aria-label="Fermer le message"
          >
            ✕
          </button>

          <div className="ticketQrScannerFs__feedbackBody">
            <div className="ticketQrScannerFs__feedbackTitle">{feedback.title}</div>
            {feedback.subtitle ? (
              <div className="ticketQrScannerFs__feedbackSubtitle">{feedback.subtitle}</div>
            ) : null}
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}