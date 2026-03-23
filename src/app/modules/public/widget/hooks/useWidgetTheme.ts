import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";

export type WidgetTheme = {
  bg: string;
  card: string;
  text: string;
  button: string;
  inputBg: string;
  inputBorder: string;
  inputPlaceholder: string;
  inputFocusRing: string;
};

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "").trim();

  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;

  const num = parseInt(full, 16);

  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function isLight(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.65;
}

function rgba(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function useWidgetTheme(): WidgetTheme {
  const [params] = useSearchParams();

  const base = useMemo(() => {
    const bg = params.get("bg") ?? "#ffffff";
    const card = params.get("card") ?? "#ffffff";
    const text = params.get("text") ?? "#111111";
    const button = params.get("button") ?? "#4f46e5";

    const lightCard = isLight(card);

    return {
      bg,
      card,
      text,
      button,
      inputBg: lightCard ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.08)",
      inputBorder: lightCard ? "rgba(0,0,0,0.14)" : "rgba(255,255,255,0.16)",
      inputPlaceholder: lightCard ? "rgba(0,0,0,0.42)" : "rgba(255,255,255,0.48)",
      inputFocusRing: rgba(button, 0.22),
    };
  }, [params]);

  return base;
}