import type {
  RegisterAnswerInput,
  RegisterAttendeeInput,
  RegisterItemInput,
  RegisterRequestBody,
} from "./types.ts";
import { badRequest } from "./errors.ts";

function toNonEmptyString(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : String(v ?? "").trim();
  return s ? s : null;
}

function isValidUuid(v: unknown): v is string {
  return typeof v === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function parseItems(input: unknown): RegisterItemInput[] {
  if (!Array.isArray(input) || input.length === 0) {
    throw badRequest("INVALID_PAYLOAD");
  }

  return input.map((it) => {
    if (!it || typeof it !== "object") {
      throw badRequest("INVALID_PAYLOAD");
    }

    const eventProductId = (it as Record<string, unknown>).eventProductId;
    const quantity = Number((it as Record<string, unknown>).quantity);

    if (!isValidUuid(eventProductId)) {
      throw badRequest("INVALID_PAYLOAD");
    }

    if (!Number.isFinite(quantity) || quantity < 1 || quantity > 100) {
      throw badRequest("INVALID_PAYLOAD");
    }

    return {
      eventProductId,
      quantity,
    };
  });
}

function parseAnswers(input: unknown): RegisterAnswerInput[] {
  if (!Array.isArray(input)) return [];

  return input.map((x) => {
    if (!x || typeof x !== "object") {
      throw badRequest("INVALID_PAYLOAD");
    }

    const eventFormFieldId = (x as Record<string, unknown>).eventFormFieldId;
    const value = (x as Record<string, unknown>).value ?? null;

    if (!isValidUuid(eventFormFieldId)) {
      throw badRequest("INVALID_PAYLOAD");
    }

    return {
      eventFormFieldId,
      value,
    };
  });
}

function parseAttendees(input: unknown): RegisterAttendeeInput[] {
  if (!Array.isArray(input)) {
    throw badRequest("INVALID_PAYLOAD");
  }

  return input.map((a) => {
    if (!a || typeof a !== "object") {
      throw badRequest("INVALID_PAYLOAD");
    }

    const eventProductId = (a as Record<string, unknown>).eventProductId;
    if (!isValidUuid(eventProductId)) {
      throw badRequest("INVALID_PAYLOAD");
    }

    return {
      eventProductId,
      answers: parseAnswers((a as Record<string, unknown>).answers),
    };
  });
}

export async function parseRegisterPayload(req: Request): Promise<RegisterRequestBody> {
  const body = await req.json().catch(() => null);

  if (!body || typeof body !== "object") {
    throw badRequest("INVALID_PAYLOAD");
  }

  const raw = body as Record<string, unknown>;

  if (!isValidUuid(raw.eventId)) {
    throw badRequest("INVALID_PAYLOAD");
  }

  const items = parseItems(raw.items);
  const attendees = parseAttendees(raw.attendees);
  const turnstileToken = toNonEmptyString(raw.turnstileToken);

  if (!turnstileToken) {
    throw badRequest("MISSING_CAPTCHA_TOKEN");
  }

  const buyer = raw.buyer && typeof raw.buyer === "object"
    ? {
        email: toNonEmptyString((raw.buyer as Record<string, unknown>).email),
        name: toNonEmptyString((raw.buyer as Record<string, unknown>).name),
        phone: toNonEmptyString((raw.buyer as Record<string, unknown>).phone),
        isAttendee:
          typeof (raw.buyer as Record<string, unknown>).isAttendee === "boolean"
            ? (raw.buyer as Record<string, unknown>).isAttendee as boolean
            : undefined,
      }
    : undefined;

  const buyerEmail = toNonEmptyString(raw.buyerEmail);
  const hasBuyer = Boolean(buyer?.email || buyer?.name || buyer?.phone);
  const hasLegacy = Boolean(buyerEmail);

  if (!hasBuyer && !hasLegacy) {
    throw badRequest("BUYER_REQUIRED");
  }

  return {
    eventId: raw.eventId,
    items,
    attendees,
    buyer,
    buyerEmail,
    turnstileToken,
    checkoutSource: toNonEmptyString(raw.checkoutSource),
    widgetReturnUrl: toNonEmptyString(raw.widgetReturnUrl),
  };
}