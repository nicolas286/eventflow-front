/* eslint-disable @typescript-eslint/no-explicit-any */

import type { PostgrestError } from "@supabase/supabase-js";
import { z } from "zod";

export type AppErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "NETWORK"
  | "UNKNOWN";

export interface AppErrorShape {
  code: AppErrorCode;
  message: string;
  cause?: unknown;
  meta?: Record<string, unknown>;
}

export class AppError extends Error implements AppErrorShape {
  code: AppErrorCode;
  cause?: unknown;
  meta?: Record<string, unknown>;

  constructor(params: AppErrorShape) {
    super(params.message);
    this.name = "AppError";
    this.code = params.code;
    this.cause = params.cause;
    this.meta = params.meta;
  }
}

export function isAppError(err: unknown): err is AppError {
  return (
    err instanceof AppError ||
    (typeof err === "object" && err !== null && "code" in err && "message" in err)
  );
}

function looksLikeNetworkError(e: unknown): boolean {
  if (e instanceof TypeError) {
    if (/Failed to fetch/i.test(e.message)) return true;
    if (/NetworkError/i.test(e.message)) return true;
  }

  if (typeof e === "object" && e !== null && "name" in e && (e as any).name === "AbortError") {
    return true;
  }

  return false;
}

function isPostgrestError(e: unknown): e is PostgrestError {
  return (
    typeof e === "object" &&
    e !== null &&
    "message" in e &&
    typeof (e as any).message === "string" &&
    "details" in e &&
    "hint" in e &&
    "code" in e
  );
}

function mapRpcMessageToAppCode(msg: string): AppErrorCode | null {
  const m = msg.trim();

  if (m === "NOT_AUTHENTICATED" || /NOT_AUTHENTICATED/i.test(m)) return "UNAUTHENTICATED";
  if (m === "FORBIDDEN" || /FORBIDDEN/i.test(m)) return "FORBIDDEN";
  if (m === "NOT_FOUND" || /NOT_FOUND/i.test(m)) return "NOT_FOUND";

  if (/VALIDATION_ERROR/i.test(m) || /VALIDATION\b/i.test(m)) return "VALIDATION";
  if (/CONFLICT/i.test(m)) return "CONFLICT";

  return null;
}


function mapSqlStateToAppCode(sqlState: string | null | undefined): AppErrorCode {
  if (!sqlState) return "UNKNOWN";

  if (sqlState === "23505") return "CONFLICT"; // unique_violation
  if (sqlState === "23503") return "CONFLICT"; // foreign_key_violation
  if (sqlState === "23502") return "VALIDATION"; // not_null_violation
  if (sqlState === "23514") return "VALIDATION"; // check_violation
  if (sqlState === "22P02") return "VALIDATION"; // invalid_text_representation
  if (sqlState === "42501") return "FORBIDDEN"; // insufficient_privilege

  return "UNKNOWN";
}

function humanStorageMessage(code: AppErrorCode, fallback: string) {
  if (code === "UNAUTHENTICATED") return "Tu dois être connecté.";
  if (code === "FORBIDDEN") return "Accès refusé.";
  if (code === "NOT_FOUND") return "Fichier introuvable.";
  if (code === "CONFLICT") return "Conflit : fichier déjà existant.";
  if (code === "VALIDATION") return "Requête invalide.";
  return fallback;
}


function humanDbMessage(pe: PostgrestError, fallbackMessage: string): string {
  const sql = pe.code;

  if (sql === "23505") return "Déjà existant : impossible de créer un doublon.";
  if (sql === "23503") return "Référence invalide : une ressource liée n’existe pas.";
  if (sql === "23502" || sql === "23514" || sql === "22P02")
    return "Données invalides. Vérifie les champs et réessaie.";
  if (sql === "42501") return "Accès refusé.";

  return fallbackMessage;
}

type StorageErrorLike = {
  message?: unknown;
  statusCode?: unknown;
  error?: unknown;
  name?: unknown;
};

function isStorageErrorLike(e: unknown): e is StorageErrorLike {
  if (typeof e !== "object" || e === null) return false;
  return "message" in e || "statusCode" in e || "error" in e;
}

function storageRawMessage(e: StorageErrorLike): string {
  return (
    (typeof e.message === "string" && e.message) ||
    (typeof e.error === "string" && e.error) ||
    ""
  );
}

function mapStorageToAppCode(e: StorageErrorLike): AppErrorCode {
  const msg = storageRawMessage(e).toLowerCase();
  const status =
    typeof e.statusCode === "number"
      ? e.statusCode
      : typeof e.statusCode === "string"
        ? Number(e.statusCode)
        : NaN;

  if (status === 401) return "UNAUTHENTICATED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "CONFLICT";
  if (status === 400) return "VALIDATION";

  if (/unauthorized|jwt|token/i.test(msg)) return "UNAUTHENTICATED";
  if (/forbidden|permission|not\s*allowed/i.test(msg)) return "FORBIDDEN";
  if (/not\s*found|no\s*such/i.test(msg)) return "NOT_FOUND";
  if (/already\s*exists|duplicate|exists|conflict/i.test(msg)) return "CONFLICT";
  if (/invalid|bad\s*request/i.test(msg)) return "VALIDATION";

  return "UNKNOWN";
}

type IdbErrorLike = {
  name?: unknown;
  message?: unknown;
};

function isDomExceptionLike(e: unknown): e is IdbErrorLike {
  return (
    typeof e === "object" &&
    e !== null &&
    "name" in e &&
    typeof (e as any).name === "string"
  );
}

function mapIdbToAppCode(name: string): AppErrorCode {
  if (name === "QuotaExceededError") return "CONFLICT";
  if (name === "NotFoundError") return "NOT_FOUND";
  if (name === "InvalidStateError") return "VALIDATION";
  if (name === "DataError") return "VALIDATION";
  if (name === "TypeMismatchError") return "VALIDATION";
  if (name === "SecurityError") return "FORBIDDEN";
  if (name === "AbortError") return "NETWORK";
  return "UNKNOWN";
}

export function normalizeError(e: unknown, fallbackMessage: string): AppError {
  if (isAppError(e)) return e;

  // ✅ Zod
  if (e instanceof z.ZodError) {
    const first = e.issues?.[0];

    return new AppError({
      code: "VALIDATION",
      message: first?.message ?? fallbackMessage,
      cause: e,
      meta: {
        kind: "zod",
        field: first?.path?.[0] ? String(first.path[0]) : null,
        issues: e.issues,
      },
    });
  }

  if (looksLikeNetworkError(e)) {
    return new AppError({
      code: "NETWORK",
      message:
        "Impossible de contacter le serveur. Vérifie ta connexion ou réessaie dans quelques minutes.",
      cause: e,
    });
  }

    if (isPostgrestError(e)) {
    const rpcCode = mapRpcMessageToAppCode(e.message);
    const code = rpcCode ?? mapSqlStateToAppCode(e.code);

    return new AppError({
        code,
        message: rpcCode ? e.message.replace(/^VALIDATION_ERROR:\s*/i, "") : humanDbMessage(e, fallbackMessage),
        cause: e,
        meta: { kind: "postgrest", sqlstate: e.code ?? null, rawMessage: e.message, details: e.details ?? null, hint: e.hint ?? null },
    });
    }


  if (isStorageErrorLike(e)) {
    const code = mapStorageToAppCode(e);
    return new AppError({
      code,
      message: humanStorageMessage(code, fallbackMessage),
      cause: e,
      meta: {
        kind: "storage",
        statusCode: (e as any).statusCode ?? null,
        rawMessage: storageRawMessage(e) || null,
      },
    });
  }

  if (isDomExceptionLike(e)) {
    const name = String((e as any).name);
    const code = mapIdbToAppCode(name);

    return new AppError({
      code,
      message: fallbackMessage,
      cause: e,
      meta: {
        kind: "idb",
        domName: name,
        rawMessage: typeof (e as any).message === "string" ? (e as any).message : null,
      },
    });
  }

  return new AppError({
    code: "UNKNOWN",
    message: fallbackMessage,
    cause: e,
  });
}
