import { z } from "npm:zod@3";
import { badRequest } from "../_shared/errors.ts";

export const orderConfirmationPayloadSchema = z.object({
  templateId: z.literal("order_confirmation_v1"),
  subject: z.string().trim().optional(),
  templateData: z.object({
    orderId: z.string().uuid(),
  }),
});

export const customMailPayloadSchema = z.object({
  to: z.string().trim().email(),
  subject: z.string().trim().min(1),
  content: z.string().trim().min(1),
  isHtml: z.boolean().optional().default(true),
});

export type OrderConfirmationPayload = z.infer<
  typeof orderConfirmationPayloadSchema
>;

export type CustomMailPayload = z.infer<typeof customMailPayloadSchema>;

export type SendConfirmationMailPayload =
  | {
      kind: "order_confirmation";
      data: OrderConfirmationPayload;
    }
  | {
      kind: "custom_mail";
      data: CustomMailPayload;
    };

export async function parseSendConfirmationMailPayload(
  req: Request,
): Promise<SendConfirmationMailPayload> {
  let raw: unknown;

  try {
    raw = await req.json();
  } catch {
    throw badRequest("INVALID_JSON_BODY");
  }

  const templateId =
    raw && typeof raw === "object" && "templateId" in raw
      ? (raw as { templateId?: unknown }).templateId
      : null;

  if (templateId === "order_confirmation_v1") {
    const parsed = orderConfirmationPayloadSchema.safeParse(raw);

    if (!parsed.success) {
      throw badRequest("INVALID_PAYLOAD", {
        issues: parsed.error.issues,
      });
    }

    return {
      kind: "order_confirmation",
      data: parsed.data,
    };
  }

  const parsed = customMailPayloadSchema.safeParse(raw);

  if (!parsed.success) {
    throw badRequest("INVALID_PAYLOAD", {
      issues: parsed.error.issues,
    });
  }

  return {
    kind: "custom_mail",
    data: parsed.data,
  };
}