function base64ToBytes(s: string) {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

function bytesToBase64(bytes: ArrayBuffer | Uint8Array) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

export function loadKeyringConfig(opts: {
  keysJsonEnv: string;
  activeKidEnv: string;
}) {
  const json = (Deno.env.get(opts.keysJsonEnv) ?? "").trim();
  const activeKid = (Deno.env.get(opts.activeKidEnv) ?? "").trim();

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

  return {
    keys,
    activeKid,
  };
}

export async function importAesGcmKey(base64Key: string) {
  const raw = base64ToBytes(base64Key);

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

export async function decryptAesGcmString(enc: string, key: CryptoKey) {
  const parts = String(enc ?? "").split(".");

  if (parts.length !== 2) {
    throw new Error("BAD_CIPHERTEXT_FORMAT");
  }

  const iv = base64ToBytes(parts[0]);
  const ct = base64ToBytes(parts[1]);

  const plain = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    ct,
  );

  return new TextDecoder().decode(plain);
}

export async function encryptAesGcmString(plain: string, key: CryptoKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const ct = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    new TextEncoder().encode(plain),
  );

  return `${bytesToBase64(iv)}.${bytesToBase64(ct)}`;
}