import { describe, expect, it } from "vitest";
import { edgeSafe } from "../../../src/shared/gateways/supabase/supabaseEdgeSafe"

function makeEdgeError(body: unknown) {
  return {
    context: {
      json: async () => body,
    },
  };
}

describe("edgeSafe", () => {
  it("retourne data quand invoke réussit", async () => {
    const result = await edgeSafe(() =>
      Promise.resolve({
        data: { ok: true, value: "hello" },
        error: null,
      }),
    );

    expect(result).toEqual({ ok: true, value: "hello" });
  });

  it("throw le code error renvoyé par l'edge", async () => {
    await expect(
      edgeSafe(() =>
        Promise.resolve({
          data: null,
          error: makeEdgeError({ error: "VALIDATION_ERROR" }),
        }),
      ),
    ).rejects.toThrow("VALIDATION_ERROR");
  });

  it("throw le message renvoyé par l'edge si pas de error", async () => {
    await expect(
      edgeSafe(() =>
        Promise.resolve({
          data: null,
          error: makeEdgeError({ message: "Something went wrong" }),
        }),
      ),
    ).rejects.toThrow("Something went wrong");
  });

  it("throw EDGE_FUNCTION_FAILED si l'erreur edge n'est pas lisible", async () => {
    await expect(
      edgeSafe(() =>
        Promise.resolve({
          data: null,
          error: makeEdgeError(null),
        }),
      ),
    ).rejects.toThrow("EDGE_FUNCTION_FAILED");
  });

  it("throw le emptyResponseCode si data est null sans erreur", async () => {
    await expect(
      edgeSafe(
        () =>
          Promise.resolve({
            data: null,
            error: null,
          }),
        "CUSTOM_EMPTY_RESPONSE",
      ),
    ).rejects.toThrow("CUSTOM_EMPTY_RESPONSE");
  });
});