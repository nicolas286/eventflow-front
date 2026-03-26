import type { PublicEventOverview } from "../../schemas/public.orgEventsOverview.schema";
import { formatDateTimeHuman, parseTs, getDaysUntil } from "@shared/helpers/dateTime";

export function getEventState(e: PublicEventOverview, nowTs: number) {
  const s = parseTs(e.startsAt);
  const end = parseTs(e.endsAt);

  if (s === null) return "unknown" as const;
  if (s > nowTs) return "upcoming" as const;

  if (end !== null) {
    if (end >= nowTs) return "ongoing" as const;
    return "past" as const;
  }

  return "ongoing" as const;
}

export function getRegistrationMicrocopy(e: PublicEventOverview, nowTs: number) {
  const deadlineTs = parseTs(e.registrationDeadline);

  if (!deadlineTs) return null;

  const formatted = formatDateTimeHuman(e.registrationDeadline!);
  const daysLeft = getDaysUntil(deadlineTs, nowTs);

  if (!e.isRegistrationOpen) {
    return `Inscriptions clôturées le ${formatted}`;
  }

  if (daysLeft <= 1) {
    return `Clôture des inscriptions aujourd’hui`;
  }

  if (daysLeft <= 3) {
    return `Plus que ${daysLeft} jours pour réserver`;
  }

  return `Clôture des inscriptions le ${formatted}`;
}

export function getEventBadgeToneAndLabel(
  e: PublicEventOverview,
  nowTs: number,
) {
  const state = getEventState(e, nowTs);
  const isClosed = !e.isRegistrationOpen;

  if (e.isSoldOut) return { tone: "danger" as const, label: "Complet" };
  if (isClosed) return { tone: "warn" as const, label: "Inscriptions clôturées" };
  if (state === "upcoming") return { tone: "info" as const, label: "À venir" };
  if (state === "ongoing") return { tone: "success" as const, label: "En cours" };

  return null;
}

export function getEventCta(e: PublicEventOverview) {
  const isClosed = !e.isRegistrationOpen;
  const disabled = e.isSoldOut || isClosed;

  if (e.isSoldOut) {
    return {
      disabled: true,
      label: "Complet",
      title: "Événement complet",
    };
  }

  if (isClosed) {
    return {
      disabled: true,
      label: "Clôturé",
      title: "Les inscriptions sont clôturées",
    };
  }

  return {
    disabled,
    label: "Réserver",
    title: "Voir les billets",
  };
}