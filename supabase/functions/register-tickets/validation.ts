import type {
  RegisterAnswerInput,
  RegisterAttendeeInput,
  RegisterItemInput,
  RegisterRequestBody,
} from "./types.ts";
import { badRequest } from "./errors.ts";

const MAX_ITEMS = 50;
const MAX_ATTENDEES = 500;
const MAX_ANSWERS_PER_ATTENDEE = 200;
const MAX_TURNSTILE_TOKEN_LENGTH = 5000;
const MAX_WIDGET_RETURN_URL_LENGTH = 200;
const MAX_BUYER_EMAIL_LENGTH = 254;
const MAX_BUYER_NAME_LENGTH = 120;
const MAX_BUYER_PHONE_LENGTH = 20;

function toOptionalTrimmedString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s ? s : null;
}

function requireObject(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== "object" || Array.isArray(v)) {
    throw badRequest("INVALID_PAYLOAD");
  }

  return v as Record<string, unknown>;
}

function isValidUuid(v: unknown): v is string {
  return typeof v === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function parseEmail(v: unknown): string | null {
  const email = toOptionalTrimmedString(v);

  if (email === null) return null;
  if (email.length > MAX_BUYER_EMAIL_LENGTH) {
    throw badRequest("INVALID_BUYER_EMAIL");
  }
  if (!isValidEmail(email)) {
    throw badRequest("INVALID_BUYER_EMAIL");
  }

  return email;
}

function parseBoundedString(
  v: unknown,
  maxLength: number,
  errorCode = "INVALID_PAYLOAD",
): string | null {
  const s = toOptionalTrimmedString(v);

  if (s === null) return null;
  if (s.length > maxLength) {
    throw badRequest(errorCode);
  }

  return s;
}

function parseCheckoutSource(v: unknown): "widget" | "public" | undefined {
  const s = toOptionalTrimmedString(v);

  if (s === null) return undefined;
  if (s !== "widget" && s !== "public") {
    throw badRequest("INVALID_PAYLOAD");
  }

  return s;
}

function parseItems(input: unknown): RegisterItemInput[] {
  if (!Array.isArray(input) || input.length === 0 || input.length > MAX_ITEMS) {
    throw badRequest("INVALID_PAYLOAD");
  }

  return input.map((it) => {
    const obj = requireObject(it);

    const eventProductId = obj.eventProductId;
    const quantityRaw = obj.quantity;

    if (!isValidUuid(eventProductId)) {
      throw badRequest("INVALID_PAYLOAD");
    }

    if (typeof quantityRaw !== "number" || !Number.isInteger(quantityRaw) || quantityRaw < 1 || quantityRaw > 100) {
      throw badRequest("INVALID_PAYLOAD");
    }

    return {
      eventProductId,
      quantity: quantityRaw,
    };
  });
}

function parseAnswerValue(value: unknown): unknown {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (value && typeof value === "object") {
    return value;
  }

  return null;
}

function parseAnswers(input: unknown): RegisterAnswerInput[] {
  if (input === undefined) return [];
  if (!Array.isArray(input) || input.length > MAX_ANSWERS_PER_ATTENDEE) {
    throw badRequest("INVALID_PAYLOAD");
  }

  return input.map((x) => {
    const obj = requireObject(x);

    const eventFormFieldId = obj.eventFormFieldId;
    if (!isValidUuid(eventFormFieldId)) {
      throw badRequest("INVALID_PAYLOAD");
    }

    return {
      eventFormFieldId,
      value: parseAnswerValue(obj.value ?? null),
    };
  });
}

function parseAttendees(input: unknown): RegisterAttendeeInput[] {
  if (!Array.isArray(input) || input.length > MAX_ATTENDEES) {
    throw badRequest("INVALID_PAYLOAD");
  }

  return input.map((a) => {
    const obj = requireObject(a);

    const eventProductId = obj.eventProductId;
    if (!isValidUuid(eventProductId)) {
      throw badRequest("INVALID_PAYLOAD");
    }

    return {
      eventProductId,
      answers: parseAnswers(obj.answers),
    };
  });
}

function parseBuyer(input: unknown): RegisterRequestBody["buyer"] {
  if (input === undefined || input === null) {
    return undefined;
  }

  const obj = requireObject(input);

  const email = parseEmail(obj.email);
  const name = parseBoundedString(obj.name, MAX_BUYER_NAME_LENGTH, "INVALID_BUYER_NAME");
  const phone = parseBoundedString(obj.phone, MAX_BUYER_PHONE_LENGTH, "INVALID_BUYER_PHONE");
  const isAttendee =
    typeof obj.isAttendee === "boolean" ? obj.isAttendee : undefined;

  const hasAnyBuyerField = Boolean(email || name || phone || typeof isAttendee === "boolean");
  if (!hasAnyBuyerField) {
    return undefined;
  }

  return {
    email,
    name,
    phone,
    isAttendee,
  };
}

export async function parseRegisterPayload(req: Request): Promise<RegisterRequestBody> {
  const body = await req.json().catch(() => null);
  const raw = requireObject(body);

  if (!isValidUuid(raw.eventId)) {
    throw badRequest("INVALID_PAYLOAD");
  }

  const items = parseItems(raw.items);
  const attendees = parseAttendees(raw.attendees);

  const turnstileToken = parseBoundedString(
    raw.turnstileToken,
    MAX_TURNSTILE_TOKEN_LENGTH,
    "MISSING_CAPTCHA_TOKEN",
  );
  if (!turnstileToken) {
    throw badRequest("MISSING_CAPTCHA_TOKEN");
  }

  const buyer = parseBuyer(raw.buyer);
  const buyerEmail = parseEmail(raw.buyerEmail);

  // Au moins un email acheteur valide doit être présent
  const effectiveBuyerEmail = buyer?.email ?? buyerEmail;
  if (!effectiveBuyerEmail) {
    throw badRequest("BUYER_EMAIL_REQUIRED");
  }

  // Cohérence: chaque attendee doit pointer vers un produit présent dans items
  const itemProductIds = new Set(items.map((x) => x.eventProductId));
  for (const attendee of attendees) {
    if (!itemProductIds.has(attendee.eventProductId)) {
      throw badRequest("INVALID_PAYLOAD");
    }
  }

  const widgetReturnUrl = parseBoundedString(
    raw.widgetReturnUrl,
    MAX_WIDGET_RETURN_URL_LENGTH,
    "INVALID_PAYLOAD",
  );

  return {
    eventId: raw.eventId,
    items,
    attendees,
    buyer,
    buyerEmail,
    turnstileToken,
    checkoutSource: parseCheckoutSource(raw.checkoutSource),
    widgetReturnUrl,
  };
}