// Erlaubt Anfragen von der GitHub-Pages-Seite an die Netlify-Funktionen.
// Weitere Adressen: Netlify-Variable ALLOWED_ORIGINS (kommagetrennt, z. B. https://meine-domain.de)
const DEFAULT = ["https://simonix55.github.io"];

export function allowedOrigins(env = process.env) {
  const extra = String(env.ALLOWED_ORIGINS || "").split(",").map((x) => x.trim().replace(/\/$/, "")).filter(Boolean);
  return [...DEFAULT, ...extra];
}

export function corsHeaders(origin, env = process.env) {
  if (origin && allowedOrigins(env).includes(origin)) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
      Vary: "Origin",
    };
  }
  return { Vary: "Origin" };
}

export function withCors(handler) {
  return async (req, context) => {
    const h = corsHeaders(req.headers.get("origin"));
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: h });
    const res = await handler(req, context);
    const out = new Response(res.body, { status: res.status, statusText: res.statusText, headers: res.headers });
    for (const [k, v] of Object.entries(h)) out.headers.set(k, v);
    return out;
  };
}
