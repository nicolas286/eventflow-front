import { describe, expect, it, vi } from "vitest";
import { mollieConnectRepo } from "../../../../src/app/modules/admin/payments/data/mollieConnectRepo";

function makeSupabaseInvokeMock(response: unknown) {
  return {
    functions: {
      invoke: vi.fn().mockResolvedValue(response),
    },
  } as any;
}

function makeEdgeError(code: string) {
  return {
    context: {
      json: async () => ({ error: code }),
    },
  };
}

const validInput = {
  orgId: "11111111-1111-4111-8111-111111111111",
  mode: "test",
} as const;

describe("mollieConnectRepo", () => {
  it("retourne l'URL Mollie quand l'edge réussit", async () => {
    const supabase = makeSupabaseInvokeMock({
      data: {
        ok: true,
        url: "https://my.mollie.com/oauth2/authorize?state=test",
      },
      error: null,
    });

    const repo = mollieConnectRepo(supabase);

    await expect(repo.startMollieConnect(validInput)).resolves.toEqual({
      ok: true,
      url: "https://my.mollie.com/oauth2/authorize?state=test",
    });

    expect(supabase.functions.invoke).toHaveBeenCalledWith("mollie-connect-start", {
      body: validInput,
    });
  });

  it("throw si le payload est invalide", async () => {
    const supabase = makeSupabaseInvokeMock({
      data: null,
      error: null,
    });

    const repo = mollieConnectRepo(supabase);

    await expect(
      repo.startMollieConnect({
        orgId: "not-a-uuid",
        mode: "test",
      } as any),
    ).rejects.toThrow();

    expect(supabase.functions.invoke).not.toHaveBeenCalled();
  });

  it("remonte l'erreur edge via edgeSafe", async () => {
    const supabase = makeSupabaseInvokeMock({
      data: null,
      error: makeEdgeError("ORIGIN_NOT_ALLOWED"),
    });

    const repo = mollieConnectRepo(supabase);

    await expect(repo.startMollieConnect(validInput)).rejects.toThrow(
      "ORIGIN_NOT_ALLOWED",
    );
  });

  it("throw si l'edge renvoie une réponse vide", async () => {
    const supabase = makeSupabaseInvokeMock({
      data: null,
      error: null,
    });

    const repo = mollieConnectRepo(supabase);

    await expect(repo.startMollieConnect(validInput)).rejects.toThrow(
      "MOLLIE_CONNECT_START_EMPTY_RESPONSE",
    );
  });
});