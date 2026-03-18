import { useSearchParams } from "react-router-dom";

export type WidgetTheme = {
  bg: string;
  card: string;
  text: string;
  button: string; 
}

export function useWidgetTheme() : WidgetTheme {
  const [params] = useSearchParams();

  return {
    bg: params.get("bg") ?? "#ffffff",
    card: params.get("card") ?? "#ffffff",
    text: params.get("text") ?? "#111111",
    button: params.get("button") ?? "#4f46e5",
  };
}