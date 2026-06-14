export function isEmailRateLimitMessage(raw: string): boolean {
  const m = raw.trim().toLowerCase();

  if (m.includes("over_email_send_rate_limit")) return true;
  if (m.includes("email rate limit")) return true;
  if (m.includes("too many requests") && m.includes("email")) return true;
  if (m.includes("rate limit") && m.includes("email")) return true;

  return false;
}

export function humanEmailRateLimitMessage(): string {
  return "Trop de demandes d’email d’affilée. Attends un peu (quelques minutes) puis réessaie.";
}