import { normalizeWebsite } from "./normalize";

function isLocalOrigin(origin: string) {
  return (
    origin.includes("localhost") ||
    origin.includes("127.0.0.1") ||
    origin.includes("0.0.0.0")
  );
}

export function makeShareEventUrl(orgSlug: string, eventSlug: string) {
  const envBase = import.meta.env.VITE_PUBLIC_BASE_URL; // ✅ Vite only
  const origin = window.location.origin;
  const base =
    envBase ||
    (isLocalOrigin(origin) ? "https://eventflow-staging.netlify.app" : origin);

  const baseUrl = normalizeWebsite(String(base));
  return `${baseUrl}/share/o/${encodeURIComponent(orgSlug)}/e/${encodeURIComponent(eventSlug)}`;
}

export function openFacebookShare(shareUrl: string) {
  const fb = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  window.open(fb, "_blank", "noopener,noreferrer");
}