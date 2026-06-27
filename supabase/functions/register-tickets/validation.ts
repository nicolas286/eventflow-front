import { registerPayloadSchema } from "./registerTickets.contracts.ts";
import { badRequest } from "./errors.ts";

export async function parseRegisterPayload(req: Request) {
  const body = await req.json().catch(() => {
    throw badRequest("INVALID_JSON");
  });

  const parsed = registerPayloadSchema.safeParse(body);

  if (!parsed.success) {
    const flat = parsed.error.flatten();

    console.warn("[register-tickets] invalid payload", flat);

    const messages = [
      ...Object.values(flat.fieldErrors).flat(),
      ...flat.formErrors,
    ];

    if (messages.includes("BUYER_EMAIL_REQUIRED")) {
      throw badRequest("BUYER_EMAIL_REQUIRED");
    }

    throw badRequest("INVALID_PAYLOAD");
  }

  return parsed.data;
}