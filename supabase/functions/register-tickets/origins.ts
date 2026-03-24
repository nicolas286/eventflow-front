export function normalizeOrigin(input: string): string {
  const url = new URL(input);
  return `${url.protocol}//${url.host}`;
}

export function parseAllowedOrigins(raw?: string | null): string[] {
  return String(raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      try {
        return normalizeOrigin(s);
      } catch {
        return "";
      }
    })
    .filter(Boolean);
}

export function resolveAppBaseUrlFromRequest(req: Request, allowedOrigins: string[]): string | null {
  const origin = req.headers.get("origin");
  if (origin) {
    try {
      const normalized = normalizeOrigin(origin);
      if (allowedOrigins.includes(normalized)) return normalized;
    } catch {
      // ignore
    }
  }

  const referer = req.headers.get("referer");
  if (referer) {
    try {
      const normalized = normalizeOrigin(referer);
      if (allowedOrigins.includes(normalized)) return normalized;
    } catch {
      // ignore
    }
  }

  return null;
}

export function getSafeWidgetReturnUrl(raw: unknown, allowedOrigins: string[]): string | null {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) return null;

  try {
    const url = new URL(value);
    const origin = `${url.protocol}//${url.host}`;

    if (!allowedOrigins.includes(origin)) return null;
    if (!url.pathname.startsWith("/widget/")) return null;

    return url.toString();
  } catch {
    return null;
  }
}

export function appendQueryParams(
  baseUrl: string,
  params: Record<string, string | number | null | undefined>,
): string {
  const url = new URL(baseUrl);

  for (const [key, value] of Object.entries(params)) {
    if (value != null && String(value).trim()) {
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}