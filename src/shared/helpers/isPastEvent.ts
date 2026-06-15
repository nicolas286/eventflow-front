type EventDateLike = {
  startsAt?: string | null;
  endsAt?: string | null;
};

export function isPastEvent(
  event: EventDateLike,
  nowMs: number = Date.now()
): boolean {
  const referenceDate = event.endsAt ?? event.startsAt;

  if (!referenceDate) {
    return false;
  }

  const timestamp = Date.parse(referenceDate);

  if (!Number.isFinite(timestamp)) {
    return false;
  }

  return timestamp < nowMs;
}