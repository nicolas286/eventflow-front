import { z } from "zod";
import { eventProductSchema } from "../db/db.eventProducts.schema";

/* ------------------------- Primitives ------------------------- */

const uuidSchema = eventProductSchema.shape.id;

const buyerEmailSchema = z.email("Email invalide").max(254, "Email trop long");
const buyerNameSchema = z.string().trim().min(2, "Nom trop court").max(120, "Nom trop long");
const buyerPhoneSchema = z.string().trim().min(6, "Téléphone trop court").max(20, "Téléphone trop long");

export const jsonValueSchema: z.ZodType<unknown> = z.union([
  z.string().trim().max(10_000),
  z.number(),
  z.boolean(),
  z.record(z.string(), z.any()),
  z.array(z.any()),
  z.null(),
]);

/* ------------------------- Answers ------------------------- */

export const adminRegisterAnswerSchema = z
  .object({
    eventFormFieldId: uuidSchema,
    value: jsonValueSchema.optional(), // absent => edge met null
  })
  .strict();

/* ------------------------- Attendees ------------------------- */

export const adminRegisterAttendeeSchema = z
  .object({
    eventProductId: uuidSchema,
    answers: z.array(adminRegisterAnswerSchema).max(200).optional(),
  })
  .strict();

/* ------------------------- Items ------------------------- */

export const adminRegisterItemSchema = z
  .object({
    eventProductId: uuidSchema,
    quantity: z.number().int().min(1).max(100),
  })
  .strict();

/* ------------------------- Buyer ------------------------- */

export const adminRegisterBuyerSchema = z
  .object({
    email: buyerEmailSchema.optional(),
    name: buyerNameSchema.optional(),
    phone: buyerPhoneSchema.optional(),
    isAttendee: z.boolean().optional(),
  })
  .strict()
  .superRefine((b, ctx) => {
    const has = Boolean(b.email || b.name || b.phone || typeof b.isAttendee === "boolean");
    if (!has) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Buyer is empty" });
  });

/* ------------------------- Admin payment opts ------------------------- */

export const offlinePaymentSchema = z
  .object({
    markPaid: z.boolean().optional(),
    payMode: z.enum(["deposit", "full", "custom"]).optional(),
    customAmountCents: z.number().int().min(1).max(50_000_000).optional(),
    paymentMethod: z.enum(["cash", "bank", "card", "other"]).optional(),
    note: z.string().trim().max(2000).optional(),
    idempotencyKey: z.string().trim().min(1).max(200).optional(),
  })
  .strict()
  .superRefine((p, ctx) => {
    if (p.markPaid && p.payMode === "custom" && !p.customAmountCents) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "customAmountCents is required when payMode=custom",
        path: ["customAmountCents"],
      });
    }
  });

/* ------------------------- Root payload ------------------------- */

export const adminRegisterPayloadSchema = z
  .object({
    eventId: uuidSchema,

    items: z.array(adminRegisterItemSchema).min(1).max(50),
    attendees: z.array(adminRegisterAttendeeSchema).max(500),

    buyerEmail: buyerEmailSchema.optional(),
    buyer: adminRegisterBuyerSchema.optional(),

    ...offlinePaymentSchema.shape,
  })
  .strict()
  .superRefine((body, ctx) => {
    const hasBuyer = Boolean(body.buyer?.email || body.buyer?.name || body.buyer?.phone);
    const hasLegacy = Boolean(body.buyerEmail);
    if (!hasBuyer && !hasLegacy) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Buyer is required (buyer or buyerEmail).",
        path: ["buyer"],
      });
    }

    const ids = new Set(body.items.map((x) => x.eventProductId));
    body.attendees.forEach((a, i) => {
      if (!ids.has(a.eventProductId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Attendee references a product not present in items",
          path: ["attendees", i, "eventProductId"],
        });
      }
    });

    const expected = body.items.reduce((acc, it) => acc + it.quantity, 0);
    if (body.attendees.length !== expected) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Attendees count mismatch (expected ${expected}, got ${body.attendees.length})`,
        path: ["attendees"],
      });
    }
  });

/* ------------------------- Response (aligned with Edge) ------------------------- */

// ✅ accepte "cancelled" et normalise en "canceled" si tu veux
const orderStatusSchema = z
  .enum(["paid", "awaiting_payment", "partially_paid", "expired", "pending", "canceled", "cancelled"])
  .transform((s) => (s === "cancelled" ? "canceled" : s));

export type AdminOrderStatus = z.infer<typeof orderStatusSchema>;

// payRes (RPC apply_order_payment) : tant que tu ne veux pas le typer finement, laisse unknown.
// Tu peux ensuite le remplacer par un vrai schema basé sur ton RPC.
const paymentAnySchema = z.unknown().nullable();

// Success : champs toujours présents, mais certains peuvent être null (online vs offline)
export const adminRegisterSuccessSchema = z
  .object({
    ok: z.literal(true),

    orderId: uuidSchema,
    currency: z.string().length(3),

    totalCents: z.number().int().min(0),
    status: orderStatusSchema,

    // online-only => null en offline
    dueNowCents: z.number().int().min(0).nullable(),
    bookingToken: z.string().trim().min(1).nullable(),
    expiresAt: z.string().nullable(), // si tu veux: .datetime().nullable() (mais only si ISO garanti)

    // offline-only (ou null si pas applicable)
    amountAppliedCents: z.number().int().min(0).nullable().optional(),
    payment: paymentAnySchema.optional(),
  })
  .strict();

// Error : discriminant => beaucoup plus solide que union
export const adminRegisterErrorSchema = z
  .object({
    ok: z.literal(false),
    error: z.string(),
    details: z.any().optional(),
  })
  .strict();

export const adminRegisterResponseSchema = z.discriminatedUnion("ok", [
  adminRegisterSuccessSchema,
  adminRegisterErrorSchema,
]);

export type AdminRegisterResponse = z.infer<typeof adminRegisterResponseSchema>;
export type AdminRegisterPayloadInput = z.input<typeof adminRegisterPayloadSchema>;
export type AdminRegisterPayload = z.output<typeof adminRegisterPayloadSchema>;
