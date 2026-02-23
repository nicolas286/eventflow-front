const { createClient } = require("@supabase/supabase-js");

function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

exports.handler = async (event) => {
  try {
    const orgSlug = event.queryStringParameters?.orgSlug;
    const eventSlug = event.queryStringParameters?.eventSlug;

    if (!orgSlug || !eventSlug) {
      return { statusCode: 400, body: "Missing params" };
    }

    const baseUrl = process.env.PUBLIC_BASE_URL || "https://eventflow-staging.netlify.app";
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseAnon = process.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnon) {
      return { statusCode: 500, body: "Missing Supabase env" };
    }

    const supabase = createClient(supabaseUrl, supabaseAnon);


    const { data: org, error: orgErr } = await supabase
      .from("orgs")
      .select("id, slug, name, description, banner_url")
      .eq("slug", orgSlug)
      .maybeSingle();

    if (orgErr || !org) return { statusCode: 404, body: "Org not found" };

    const { data: ev, error: evErr } = await supabase
      .from("events")
      .select("slug, title, description, banner_url")
      .eq("org_id", org.id)
      .eq("slug", eventSlug)
      .maybeSingle();

    if (evErr || !ev) return { statusCode: 404, body: "Event not found" };

    const title = `${ev.title} – ${org.name}`;
    const desc = (ev.description || org.description || "").slice(0, 160) || "Infos et billets.";


    const ogImage =
      ev.banner_url ||
      org.banner_url ||
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
</head>
<body>
Redirecting…
</body>
</html>`;

    return {
      statusCode: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=300", // 5 min
      },
      body: html,
    };
  } catch (e) {
    return { statusCode: 500, body: "Server error" };
  }
};