type SupabaseEdgeResponse<T> = {
  data: T | null;
  error: unknown;
};

async function extractEdgeErrorMessage(error: unknown): Promise<string | null> {
  const ctx = (error as any)?.context;

  try {
    const body = await ctx?.json?.();

    if (body && typeof body === "object") {
      const obj = body as Record<string, unknown>;

      if (typeof obj.error === "string") return obj.error;
      if (typeof obj.message === "string") return obj.message;
    }
  } catch {
    // ignore
  }

  if (error instanceof Error) return error.message;

  return null;
}

export async function edgeSafe<T>(
  fn: () => PromiseLike<SupabaseEdgeResponse<T>>,
  emptyResponseCode = "EDGE_EMPTY_RESPONSE"
): Promise<T> {
  const { data, error } = await fn();

  if (error) {
    const message = await extractEdgeErrorMessage(error);
    throw new Error(message ?? "EDGE_FUNCTION_FAILED", { cause: error });
  }

  if (data == null) {
    throw new Error(emptyResponseCode);
  }

  return data;
}