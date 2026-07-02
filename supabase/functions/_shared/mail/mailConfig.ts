function envTrim(name: string): string | null {
  const value = Deno.env.get(name);
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed || null;
}

export type MailConfig = {
  resendApiKey: string;
  defaultFrom: string;
};

export function resolveMailConfig(): MailConfig {
  const resendApiKey = envTrim("RESEND_API_KEY");

  if (!resendApiKey) {
    throw new Error("Missing RESEND_API_KEY");
  }

  return {
    resendApiKey,
    defaultFrom:
      envTrim("MAIL_DEFAULT_FROM") ??
      "Eventflow <no-reply@useeventflow.eu>",
  };
}