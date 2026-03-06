import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ------------------------------------------------------------------ */
/* CORS + helpers                                                     */
/* ------------------------------------------------------------------ */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function envTrim(name: string): string | null {
  const v = Deno.env.get(name);
  const t = typeof v === "string" ? v.trim() : "";
  return t ? t : null;
}

function safeEq(a: string, b: string) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

/* ------------------------------------------------------------------ */
/* Edge handler                                                       */
/* ------------------------------------------------------------------ */

Deno.serve(async (req) => {
  try {
    /* -------------------- */
    /* Preflight / method  */
    /* -------------------- */
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (req.method !== "POST") {
      return json({ ok: false, error: "Method not allowed" }, 405);
    }

    /* -------------------- */
    /* Cron auth            */
    /* -------------------- */
    const expected = envTrim("CRON_SECRET");
    const gotRaw = req.headers.get("x-cron-secret");

    if (!expected) {
      return json(
        {
          ok: false,
          error: "CONFIG_MISSING",
          debug: { missing: "CRON_SECRET" },
        },
        500,
      );
    }

    const got = (gotRaw ?? "").trim();
    const authorized = Boolean(got) && safeEq(got, expected);

    if (!authorized) {
      return json(
        {
          ok: false,
          error: "Unauthorized",
          debug: {
            hasHeader: Boolean(gotRaw),
            gotLen: got.length,
            expectedLen: expected.length,
            gotPrefix: got.slice(0, 4),
            expectedPrefix: expected.slice(0, 4),
            gotTrimChanged: gotRaw !== null ? got !== gotRaw : null,
            expectedTrimChanged: expected !== expected.trim(),
          },
        },
        401,
      );
    }

    /* -------------------- */
    /* Supabase admin       */
    /* -------------------- */
    const supabaseUrl = envTrim("SUPABASE_URL");
    const serviceKey = envTrim("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      return json(
        {
          ok: false,
          error: "CONFIG_MISSING",
          debug: {
            missing: [
              !supabaseUrl ? "SUPABASE_URL" : null,
              !serviceKey ? "SUPABASE_SERVICE_ROLE_KEY" : null,
            ].filter(Boolean),
          },
        },
        500,
      );
    }

    const admin = createClient(supabaseUrl, serviceKey);

    /* -------------------- */
    /* Business logic       */
    /* -------------------- */
    const { data, error } = await admin.rpc("expire_orders", { p_limit: 200 });

    if (error) {
      return json(
        {
          ok: false,
          error: "RPC_EXPIRE_ORDERS_FAILED",
          details: error.message,
        },
        400,
      );
    }

    /* -------------------- */
    /* Success              */
    /* -------------------- */
    return json(
      {
        ok: true,
        expiredCount: Array.isArray(data) ? data.length : null,
        data,
      },
      200,
    );
  } catch (e) {
    console.error("[expire-orders] unexpected", e);
    return json({ ok: false, error: "Unexpected error" }, 500);
  }
});
