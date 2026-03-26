import { parseTs, getDaysUntil, getCalendarDayDiff } from "@shared/helpers/dateTime";
import type { PublicEventOverview } from "../../schemas/public.orgEventsOverview.schema";

function computeEventRibbon(e: PublicEventOverview, nowTs: number) {
  const deadlineTs = parseTs(e.registrationDeadline);
  const startTs = parseTs(e.startsAt);

  if (!e.isRegistrationOpen || e.isSoldOut) return null;

  // priorité : deadline inscription
  if (deadlineTs && deadlineTs > nowTs) {
    const daysLeft = getDaysUntil(deadlineTs, nowTs);

    if (daysLeft <= 1) {
      return {
        label: "Dernier jour",
        type: "deadline" as const,
      };
    }

    if (daysLeft <= 3) {
      return {
        label: `Clôture des réservations · ${daysLeft} jours`,
        type: "deadline" as const,
      };
    }

    return null;
  }

  // fallback : proximité événement
  if (startTs && startTs > nowTs) {
  const diffDays = getCalendarDayDiff(startTs, nowTs);

  if (diffDays <= 1) {
    return {
      label: "Demain",
      type: "start" as const,
    };
  }

  if (diffDays <= 7) {
    return {
      label: `Bientôt · ${diffDays} jours`,
      type: "start" as const,
    };
  }
}

  return null;
}

export function useEventRibbon(e: PublicEventOverview, nowTs: number) {
  return computeEventRibbon(e, nowTs);
}