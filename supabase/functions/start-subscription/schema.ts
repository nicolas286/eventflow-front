import { z } from "https://esm.sh/zod@4";

export const startSubscriptionPayloadSchema = z
  .object({
    orgId: z.uuid(),
    plan: z
      .string()
      .trim()
      .toLowerCase()
      .pipe(z.enum(["starter", "pro"])),
    promoCode: z
      .string()
      .trim()
      .toUpperCase()
      .min(1)
      .max(100)
      .nullable()
      .optional(),
  })
  .strict();

export type StartSubscriptionPayload = z.infer<typeof startSubscriptionPayloadSchema>;

export function parseStartSubscriptionPayload(input: unknown) {
  return startSubscriptionPayloadSchema.safeParse(input);
}