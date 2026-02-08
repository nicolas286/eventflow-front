type Rgb = { r: number; g: number; b: number };

function hexToRgb(hex: string): Rgb | null {
  const h = hex.replace("#", "").trim();
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  if (full.length !== 6) return null;

  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function rgbToTriplet({ r, g, b }: Rgb) {
  return `${r} ${g} ${b}`;
}

function luminance01({ r, g, b }: Rgb) {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function clampByte(n: number) {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function darken(rgb: Rgb, amount: number): Rgb {
  const k = 1 - amount; // amount 0..1
  return {
    r: clampByte(rgb.r * k),
    g: clampByte(rgb.g * k),
    b: clampByte(rgb.b * k),
  };
}

function getContrastTripletFromRgb(rgb: Rgb) {
  const lum = luminance01(rgb);
  return lum > 0.2 ? "17 24 39" : "255 255 255";
}

export function applyOrgTheme(primaryHex: string) {
  const rgb = hexToRgb(primaryHex) ?? { r: 228, g: 157, b: 33 };

  const lum = luminance01(rgb);

  const PRIMARY_TOO_LIGHT = 0.78;

  // ✅ primary strong: si trop clair => on fonce plus que secondary
  const primaryStrongRgb = lum > PRIMARY_TOO_LIGHT ? darken(rgb, 0.52) : rgb;

  // ✅ secondary derived: un peu moins foncé que primary strong
  const secondaryDerivedRgb = lum > PRIMARY_TOO_LIGHT ? darken(rgb, 0.38) : rgb;

  const html = document.documentElement;
  const body = document.body;

  const primaryTriplet = rgbToTriplet(rgb);

  const primaryStrongTriplet = rgbToTriplet(primaryStrongRgb);
  const primaryStrongContrast = getContrastTripletFromRgb(primaryStrongRgb);

  const secondaryDerivedTriplet = rgbToTriplet(secondaryDerivedRgb);
  const secondaryDerivedContrast = getContrastTripletFromRgb(secondaryDerivedRgb);

  [html, body].forEach((el) => {
    // brand
    el.style.setProperty("--primary", primaryTriplet);

    // ✅ primary "dominant"
    el.style.setProperty("--primary-strong", primaryStrongTriplet);
    el.style.setProperty("--primary-strong-contrast", primaryStrongContrast);

    // ✅ secondary fallback
    el.style.setProperty("--secondary-derived", secondaryDerivedTriplet);
    el.style.setProperty("--secondary-derived-contrast", secondaryDerivedContrast);

    el.style.setProperty("--ghost-fg", secondaryDerivedContrast);
    el.style.setProperty("--ghost-border", secondaryDerivedTriplet);
  });

  html.classList.toggle("theme--primaryLight", lum > PRIMARY_TOO_LIGHT);
}
