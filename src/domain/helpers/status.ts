import type { BadgeTone } from "../../ui/components/badge/Badge";

export type StatusValue = "draft" | "open" | "soon" | "soldout";

export type StatusOption = {
  value: StatusValue;
  label: string;
  tone: BadgeTone;
};

export const statusOptions: StatusOption[] = [
  { value: "draft", label: "Brouillon", tone: "neutral" },
  { value: "open", label: "Ouvert", tone: "success" },
  { value: "soon", label: "Bientôt complet", tone: "warn" },
  { value: "soldout", label: "Complet", tone: "danger" },
];

export function getStatusInfo(status: string): StatusOption {
  return statusOptions.find((s) => s.value === status) ?? statusOptions[0];
}

export function getPublicStatusInfo(status: string): { tone: BadgeTone; label: string } {
  if (status === "open") return { tone: "success", label: "Inscriptions ouvertes" };
  if (status === "soon") return { tone: "warn", label: "Bientôt complet" };
  if (status === "soldout") return { tone: "danger", label: "Complet" };
  if (status === "draft") return { tone: "neutral", label: "Brouillon" };
  return { tone: "neutral", label: "Statut" };
}