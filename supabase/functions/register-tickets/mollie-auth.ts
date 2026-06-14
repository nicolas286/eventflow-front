import { badGateway, conflict, internal } from "./errors.ts";
import { decryptToken, encryptToken, importAesKey, loadEncConfig } from "./encryption.ts";
function isExpired(expiresAtIso) {
  if (!expiresAtIso) return true;
  const t = Date.parse(expiresAtIso);
  if (!Number.isFinite(t)) return true;
  return t - Date.now() < 60_000;
}
async function refreshMollieAccessToken(refreshToken) {
  const clientId = Deno.env.get("MOLLIE_CONNECT_CLIENT_ID")?.trim();
  const clientSecret = Deno.env.get("MOLLIE_CONNECT_CLIENT_SECRET")?.trim();
  if (!clientId || !clientSecret) {
    throw internal("CONNECT_CLIENT_MISSING");
  }
  const res = await fetch("https://api.mollie.com/oauth2/tokens", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret
    }).toString()
  });
  const txt = await res.text().catch(()=>"");
  let j = null;
  try {
    j = JSON.parse(txt);
  } catch  {}
  if (!res.ok) {
    throw badGateway("ORG_TOKEN_REFRESH_FAILED", txt);
  }
  const accessToken = j?.access_token;
  const newRefreshToken = j?.refresh_token ?? refreshToken;
  const expiresIn = Number(j?.expires_in ?? 0);
  const scope = j?.scope;
  if (!accessToken || !expiresIn) {
    throw badGateway("ORG_TOKEN_REFRESH_BAD_PAYLOAD", j);
  }
  return {
    accessToken,
    refreshToken: newRefreshToken,
    expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
    scope
  };
}
export async function getValidOrgMollieAccessOrThrow(admin, orgId, _config) {
  const { data: rows, error } = await admin.rpc("get_org_mollie_connect_secrets", {
    p_org_id: orgId
  });
  if (error) throw internal("PAYMENTS_CONFIG_LOAD_FAILED");
  const mc = Array.isArray(rows) ? rows[0] : null;
  if (!mc || mc.status !== "connected") {
    throw conflict("ORG_NOT_CONNECTED");
  }
  if (!mc.access_token_enc || !mc.refresh_token_enc || !mc.enc_kid) {
    throw conflict("ORG_TOKEN_MISSING");
  }
  const { keys, activeKid } = loadEncConfig();
  const currentKeyB64 = keys[mc.enc_kid];
  if (!currentKeyB64) {
    throw internal("ORG_TOKEN_KEY_NOT_FOUND");
  }
  const currentKey = await importAesKey(currentKeyB64);
  let accessToken = await decryptToken(mc.access_token_enc, currentKey);
  let refreshToken = await decryptToken(mc.refresh_token_enc, currentKey);
  if (isExpired(mc.access_token_expires_at)) {
    const refreshed = await refreshMollieAccessToken(refreshToken);
    accessToken = refreshed.accessToken;
    refreshToken = refreshed.refreshToken;
    const activeKey = await importAesKey(keys[activeKid]);
    const newAccessEnc = await encryptToken(accessToken, activeKey);
    const newRefreshEnc = await encryptToken(refreshToken, activeKey);
    const { error: upErr } = await admin.rpc("update_org_mollie_tokens", {
      p_org_id: orgId,
      p_access_token_enc: newAccessEnc,
      p_refresh_token_enc: newRefreshEnc,
      p_enc_kid: activeKid,
      p_enc_alg: "A256GCM",
      p_expires_at: refreshed.expiresAt,
      p_scopes: refreshed.scope ?? mc.scopes ?? null
    });
    if (upErr) {
      throw internal("ORG_TOKEN_UPDATE_FAILED");
    }
  }
  if (!mc.mollie_profile_id) {
    throw conflict("MOLLIE_PROFILE_MISSING");
  }
  return {
    accessToken,
    profileId: mc.mollie_profile_id,
    isTest: mc.mode === "test"
  };
}
