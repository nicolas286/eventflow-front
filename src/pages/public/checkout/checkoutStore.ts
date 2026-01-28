export type SelectedProduct = {
  productId: string;
  qty: number;
};

export type AttendeeAnswers = Record<string, unknown>;

export type CheckoutDraft = {
  orgSlug: string;
  eventSlug: string;

  // productId -> qty
  quantities: Record<string, number>;

  // Generated based on createsAttendees + attendeesPerUnit
  attendees: AttendeeAnswers[];

  // simple flag used at checkout
  acceptedTerms?: boolean;
};

const makeKey = (orgSlug: string, eventSlug: string) =>
  `checkout:${orgSlug}:${eventSlug}`;

export function loadDraft(orgSlug: string, eventSlug: string): CheckoutDraft {
  const key = makeKey(orgSlug, eventSlug);
  const raw = sessionStorage.getItem(key);
  if (!raw) {
    return {
      orgSlug,
      eventSlug,
      quantities: {},
      attendees: [],
      acceptedTerms: false,
    };
  }

  try {
    const parsed = JSON.parse(raw) as CheckoutDraft;
    return {
      orgSlug,
      eventSlug,
      quantities: parsed.quantities ?? {},
      attendees: parsed.attendees ?? [],
      acceptedTerms: parsed.acceptedTerms ?? false,
    };
  } catch {
    return {
      orgSlug,
      eventSlug,
      quantities: {},
      attendees: [],
      acceptedTerms: false,
    };
  }
}

export function saveDraft(draft: CheckoutDraft) {
  const key = makeKey(draft.orgSlug, draft.eventSlug);
  sessionStorage.setItem(key, JSON.stringify(draft));
}

export function clearDraft(orgSlug: string, eventSlug: string) {
  sessionStorage.removeItem(makeKey(orgSlug, eventSlug));
}

export function formatMoney(cents: number, currency: string) {
  // simple + safe
  const amount = (cents / 100).toFixed(2);
  return `${amount} ${currency}`;
}
