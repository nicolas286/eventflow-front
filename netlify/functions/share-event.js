const { createClient } = require("@supabase/supabase-js");

function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeSlice(s, n = 160) {
  const t = String(s ?? "").trim();
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
}

exports.handler = async (event) => {
   try {
    const path = event.path || "";
    const m = path.match(/^\/share\/o\/([^/]+)\/e\/([^/]+)\/?$/);

    const orgSlug = m?.[1];
    const eventSlug = m?.[2];

    if (!orgSlug || !eventSlug) {
      return { statusCode: 400, body: "Missing params" };
    }

    const baseUrl = (process.env.PUBLIC_BASE_URL || "https://eventflow-staging.netlify.app").replace(/\/+$/, "");
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseAnon = process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnon) {
      return { statusCode: 500, body: "Missing Supabase env" };
    }

    const supabase = createClient(supabaseUrl, supabaseAnon);

    // 1) org via RPC public
    const { data: org, error: orgErr } = await supabase.rpc("get_public_org_by_slug", {
      p_slug: orgSlug,
    });

    if (orgErr || !org) {
      return { statusCode: 404, body: "Org not found" };
    }

    // 2) events overview via RPC public (tu l’as déjà)
    // on cherche l’event par slug dans le résultat
    const { data: overview, error: ovErr } = await supabase.rpc("get_public_org_events_overview", {
      p_org_slug: orgSlug,
    });

    if (ovErr || !overview) {
      return { statusCode: 404, body: "Events not found" };
    }

    // ⚠️ adapte selon la shape exacte que renvoie ta RPC
    // Je pars sur un truc classique : overview.events = [{ slug, title, description, bannerUrl/banner_url, ... }]
    const events = overview?.events ?? overview?.data?.events ?? [];
    const ev = Array.isArray(events) ? events.find((x) => String(x?.slug) === eventSlug) : null;

    if (!ev) {
      return { statusCode: 404, body: "Event not found" };
    }

    const orgName = org?.name ?? "Eventflow";
    const orgDesc = org?.description ?? "";

    const evTitle = ev?.title ?? "Événement";
    const evDesc = ev?.description ?? "";

    const title = `${evTitle} – ${orgName}`;
    const desc = safeSlice(evDesc || orgDesc || "Infos et billets.", 160);

    // banner url : adapte clés camel/snake selon ton RPC
    const ogImage =
      ev?.bannerUrl ||
      ev?.banner_url ||
      org?.bannerUrl ||
      org?.banner_url ||
      `${baseUrl}/og/default.jpg`;

    const targetUrl = `${baseUrl}/o/${encodeURIComponent(orgSlug)}/e/${encodeURIComponent(eventSlug)}/billets`;
    const shareUrl = `${baseUrl}/share/o/${encodeURIComponent(orgSlug)}/e/${encodeURIComponent(eventSlug)}`;

    const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}"/>
<link rel="canonical" href="${esc(targetUrl)}"/>

<meta property="og:type" content="website"/>
<meta property="og:title" content="${esc(title)}"/>
<meta property="og:description" content="${esc(desc)}"/>
<meta property="og:url" content="${esc(shareUrl)}"/>
<meta property="og:image" content="${esc(ogImage)}"/>

<meta name="twitter:card" content="summary_large_image"/>

<meta http-equiv="refresh" content="0;url=${esc(targetUrl)}"/>
<script>window.location.replace(${JSON.stringify(targetUrl)});</script>
</head>
<body>Redirecting…</body>
</html>`;

    return {
      statusCode: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=300",
        "x-ef-share": "1",
      },
      body: html,
    };
  } catch (e) {
    return { statusCode: 500, body: "Server error" };
  }
};