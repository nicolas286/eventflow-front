function ub64(s: string): Uint8Array {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

function b64(bytes: ArrayBuffer | Uint8Array): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

export function loadEncConfig(): { keys: Record<string, string>; activeKid: string } {
  const json = (Deno.env.get("MOLLIE_TOKEN_ENC_KEYS_JSON") ?? "").trim();
  const activeKid = (Deno.env.get("MOLLIE_TOKEN_ENC_KID_ACTIVE") ?? "").trim();

  if (!json || !activeKid) {
    throw new Error("MISSING_ENC_CONFIG");
  }

  let keys: Record<string, string>;
  try {
    keys = JSON.parse(json);
  } catch {
    throw new Error("BAD_ENC_KEYS_JSON");
  }

  if (!keys[activeKid]) {
    throw new Error("ACTIVE_KID_NOT_FOUND");
  }

  return { keys, activeKid };
}

export async function importAesKey(base64Key: string): Promise<CryptoKey> {
  const raw = ub64(base64Key);

  if (raw.byteLength !== 32) {
    throw new Error("BAD_KEY_LENGTH");
  }

  return await crypto.subtle.importKey(
    "raw",
    raw,
    "AES-GCM",
    false,
    ["encrypt", "decrypt"],
  );
}

export async function decryptToken(enc: string, key: CryptoKey): Promise<string> {
  const parts = String(enc ?? "").split(".");
  if (parts.length !== 2) {
    throw new Error("BAD_CIPHERTEXT_FORMAT");
  }

  const iv = ub64(parts[0]);
  const ct = ub64(parts[1]);

  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ct,
  );

  return new TextDecoder().decode(plain);
}

export async function encryptToken(plain: string, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plain),
  );

  return `${b64(iv)}.${b64(ct)}`;
}