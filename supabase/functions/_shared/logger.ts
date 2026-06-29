export function createEdgeLogger(scope: string) {
  const requestId = crypto.randomUUID();

  function base(level: "log" | "warn" | "error", step: string, data: Record<string, unknown> = {}) {
    console[level](`[${scope}]`, {
      requestId,
      step,
      ...data,
    });
  }

  return {
    requestId,
    info: (step: string, data?: Record<string, unknown>) => base("log", step, data),
    warn: (step: string, data?: Record<string, unknown>) => base("warn", step, data),
    error: (step: string, data?: Record<string, unknown>) => base("error", step, data),
  };
}

export function serializeError(e: unknown) {
  if (e instanceof Error) {
    return {
      name: e.name,
      message: e.message,
      stack: e.stack,
    };
  }

  return {
    message: String(e),
  };
}