import { z } from "npm:zod@3";
import { badRequest } from "../_shared/errors.ts";

export const cronReminderPayloadSchema = z.object({
  mode: z.literal("cron").optional().default("cron"),
});

export const manualReminderPayloadSchema = z.object({
  mode: z.literal("manual"),
  orderId: z.string().uuid(),
  /**
   * Par défaut le mode manuel sert de dry-run : on construit le mail,
   * mais on ne loggue pas l'idempotence et on ne l'envoie pas.
   */
  debug: z.boolean().optional().default(true),
});

export type CronReminderPayload = z.infer<typeof cronReminderPayloadSchema>;
export type ManualReminderPayload = z.infer<typeof manualReminderPayloadSchema>;

export type SendReminderMailPayload =
  | {
      kind: "cron";
      data: CronReminderPayload;
    }
  | {
      kind: "manual";
      data: ManualReminderPayload;
    };

export async function parseSendReminderMailPayload(
  req: Request,
): Promise<SendReminderMailPayload> {
  let raw: unknown = { mode: "cron" };

  try {
    const text = await req.text();
    raw = text.trim() ? JSON.parse(text) : { mode: "cron" };
  } catch {
    throw badRequest("INVALID_JSON_BODY");
  }

  const mode =
    raw && typeof raw === "object" && "mode" in raw
      ? (raw as { mode?: unknown }).mode
      : "cron";

  if (mode === "manual") {
    const parsed = manualReminderPayloadSchema.safeParse(raw);

    if (!parsed.success) {
      throw badRequest("INVALID_PAYLOAD", {
        issues: parsed.error.issues,
      });
    }

    return {
      kind: "manual",
      data: parsed.data,
    };
  }

  const parsed = cronReminderPayloadSchema.safeParse(raw ?? { mode: "cron" });

  if (!parsed.success) {
    throw badRequest("INVALID_PAYLOAD", {
      issues: parsed.error.issues,
    });
  }

  return {
    kind: "cron",
    data: parsed.data,
  };
}
