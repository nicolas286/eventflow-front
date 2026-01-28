import { z } from "zod";

import { eventProductSchema } from "../db/db.eventProducts.schema";

/* ------------------------------------------------------------
   Register payload (front -> edge function)
   - DB: pas de first/last/email/phone sur order_attendees
   - donc on met tout dans answers (value: jsonb)
------------------------------------------------------------ */

/* ------------------------- Primitives ------------------------- */

const uuidSchema = eventProductSchema.shape.id;

const buyerEmailSchema = z.email("Email invalide").max(254, "Email trop long");
const buyerNameSchema = z.string().trim().min(2, "Nom trop court").max(120, "Nom trop long");
const buyerPhoneSchema = z.string().trim().min(6, "Téléphone trop court").max(20, "Téléphone trop long");

/* ------------------------- jsonb value ------------------------- */

// jsonb-ish: string | number | boolean | object | array | null
// (on limite la taille des strings, le reste on laisse flexible)
export const jsonValueSchema: z.ZodType<unknown> = z.union([
  z.string().trim().max(10_000),
  z.number(),
  z.boolean(),
  z.record(z.string(), z.any()),
  z.array(z.any()),
  z.null(),
]);

/* ------------------------- Answers ------------------------- */

export const registerAnswerSchema = z
  .object({
    eventFormFieldId: uuidSchema,
    value: jsonValueSchema.optional(), // si absent => edge mettra null
  })
  .strict();

/* ------------------------- Attendees ------------------------- */

export const registerAttendeeSchema = z
  .object({
    eventProductId: uuidSchema,
    answers: z.array(registerAnswerSchema).max(200).optional(),
  })
  .strict();

/* ------------------------- Items ------------------------- */

export const registerItemSchema = z
  .object({
    eventProductId: uuidSchema,
    quantity: z.number().int().min(1).max(100),
  })
  .strict();

/* ------------------------- Buyer ------------------------- */

export const registerBuyerSchema = z
  .object({
    email: buyerEmailSchema.optional(),
    name: buyerNameSchema.optional(),
    phone: buyerPhoneSchema.optional(),
    isAttendee: z.boolean().optional(),
  })
  .strict()
  .superRefine((b, ctx) => {
    const has = Boolean(b.email || b.name || b.phone || typeof b.isAttendee === "boolean");
    if (!has) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Buyer is empty",
      });
    }
  });

/* ------------------------- Root payload ------------------------- */

export const registerPayloadSchema = z
  .object({
    eventId: uuidSchema,

    items: z.array(registerItemSchema).min(1).max(50),
    attendees: z.array(registerAttendeeSchema).max(500),

    // legacy compat (si un ancien front l’envoie encore)
    buyerEmail: buyerEmailSchema.optional(),

    // nouveau
    buyer: registerBuyerSchema.optional(),

    // ton edge le rend obligatoire
    turnstileToken: z.string().trim().min(1).max(5000),
  })
  .strict()
  .superRefine((body, ctx) => {
    // buyer explicite OU buyerEmail legacy (sinon tu dois parser depuis answers = heuristique)
    const hasBuyer = Boolean(body.buyer?.email || body.buyer?.name || body.buyer?.phone);
    const hasLegacy = Boolean(body.buyerEmail);

    if (!hasBuyer && !hasLegacy) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Buyer is required (buyer or buyerEmail).",
        path: ["buyer"],
      });
    }

    // cohérence: chaque attendee doit référencer un produit présent dans items
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
  });

/* ------------------------- Types ------------------------- */

export type RegisterPayloadInput = z.input<typeof registerPayloadSchema>;
export type RegisterPayload = z.output<typeof registerPayloadSchema>;

/* ------------------------------------------------------------
   Register response (edge -> front)
------------------------------------------------------------ */

export const registerSuccessPaidSchema = z
  .object({
    ok: z.literal(true),
    orderId: uuidSchema,
    status: z.literal("paid"),
    bookingToken: z.string().nullable().optional(),
  })
  .strict();

export const registerSuccessAwaitingPaymentSchema = z
  .object({
    ok: z.literal(true),
    orderId: uuidSchema,
    status: z.literal("awaiting_payment"),
    checkoutUrl: z.string().url(),
    amountDueNowCents: z.number().int().min(1),
    totalCents: z.number().int().min(0),
  })
  .strict();

export const registerSuccessSchema = z.union([
  registerSuccessPaidSchema,
  registerSuccessAwaitingPaymentSchema,
]);

export const registerErrorSchema = z
  .object({
    ok: z.literal(false).optional(), // ton edge renvoie plutôt { error: ... } sans ok
    error: z.string(),
    details: z.any().optional(),
  })
  .strict();

export const registerResponseSchema = z.union([registerSuccessSchema, registerErrorSchema]);

export type RegisterResponse = z.infer<typeof registerResponseSchema>;
export type RegisterSuccess = z.infer<typeof registerSuccessSchema>;

/* ------------------------------------------------------------
   RPC args mapping (edge -> create_order_intent)
   (utile côté front si tu veux typer un mock / tests)
------------------------------------------------------------ */

export const createOrderIntentArgsSchema = z
  .object({
    p_event_id: uuidSchema,
    p_items: z
      .array(
        z
          .object({
            event_product_id: uuidSchema,
            quantity: z.number().int().min(1).max(100),
          })
          .strict()
      )
      .min(1)
      .max(50),
    p_attendees: z
      .array(
        z
          .object({
            event_product_id: uuidSchema,
            // DB: pas de noms/emails sur table order_attendees -> on laisse null
            first_name: z.null(),
            last_name: z.null(),
            email: z.null(),
            phone: z.null(),
            answers: z
              .array(
                z
                  .object({
                    event_form_field_id: uuidSchema,
                    value: jsonValueSchema.nullable().optional(),
                  })
                  .strict()
              )
              .optional(),
          })
          .strict()
      )
      .max(500),
    p_buyer: z
      .object({
        email: buyerEmailSchema.nullable().optional(),
        name: buyerNameSchema.nullable().optional(),
        phone: buyerPhoneSchema.nullable().optional(),
        is_attendee: z.boolean().nullable().optional(),
      })
      .strict(),
    p_rate_key: z.string().min(1),
  })
  .strict();

export type CreateOrderIntentArgs = z.infer<typeof createOrderIntentArgsSchema>;

/* ------------------------------------------------------------
   Mapper helpers
------------------------------------------------------------ */

export function toCreateOrderIntentArgs(payload: RegisterPayload, rateKey: string): CreateOrderIntentArgs {
  // buyer explicite > buyerEmail legacy
  const buyer = payload.buyer ?? {};
  const email = buyer.email ?? payload.buyerEmail ?? null;

  const p_buyer = {
    email,
    name: buyer.name ?? null,
    phone: buyer.phone ?? null,
    is_attendee: typeof buyer.isAttendee === "boolean" ? buyer.isAttendee : null,
  };

  return {
    p_event_id: payload.eventId,
    p_items: payload.items.map((it) => ({
      event_product_id: it.eventProductId,
      quantity: it.quantity,
    })),
    p_attendees: payload.attendees.map((a) => ({
      event_product_id: a.eventProductId,
      first_name: null,
      last_name: null,
      email: null,
      phone: null,
      answers: (a.answers ?? []).map((x) => ({
        event_form_field_id: x.eventFormFieldId,
        value: x.value ?? null,
      })),
    })),
    p_buyer,
    p_rate_key: rateKey,
  };
}
