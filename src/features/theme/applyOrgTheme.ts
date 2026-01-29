export function hexToRgbTriplet(hex: string) {
  const h = hex.replace("#", "").trim();

  if (h.length === 3) {
    const r = parseInt(h[0] + h[0], 16);
    const g = parseInt(h[1] + h[1], 16);
    const b = parseInt(h[2] + h[2], 16);
    return `${r}, ${g}, ${b}`;
  }

  if (h.length === 6) {
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `${r}, ${g}, ${b}`;
  }

  return "228, 157, 33"; // fallback 
}

export function getContrastTriplet(hex: string) {
  const h = hex.replace("#", "").trim();
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  if (full.length !== 6) return "255, 255, 255";

  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? "17, 24, 39" : "255, 255, 255";
}

export function applyOrgTheme(primaryHex: string) {
  const root = document.documentElement;

  root.style.setProperty("--primary", hexToRgbTriplet(primaryHex));
  root.style.setProperty("--primary-bg", hexToRgbTriplet(primaryHex));
  root.style.setProperty("--primary-contrast", getContrastTriplet(primaryHex));
}
