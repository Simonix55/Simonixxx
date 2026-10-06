// Erlaubt Anfragen von der GitHub-Pages-Seite an die Netlify-Funktionen (CORS).
// Weitere Adressen: Netlify-Variable ALLOWED_ORIGINS (kommagetrennt).
const DEFAULTS = ["https://simonix55.github.io"];

export function allowedOrigins(env = process.env.ALLOWED_ORIGINS) {
  const extra = String(env || "").split(",").map((s) => s.trim().replace(/\/$/, "")).filter(Boolean);
  return [...DEFAULTS, ...extra];
}

export function corsHeaders(req, env) {
  const origin = (req.headers.get("origin") || "").replace(/\/$/, "");
  const h = { Vary: "Origin" };
  if (origin && allowedOrigins(env).includes(origin)) {
    h["Access-Control-Allow-Origin"] = origin;
    h["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
    h["Access-Control-Allow-Headers"] = "Content-Type, Authorization";
    h["Access-Control-Max-Age"] = "86400";
  }
  return h;
}

export function withCors(handler) {
  return async (req, context) => {
    const cors = corsHeaders(req);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    const res = await handler(req, context);
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
    return res;
  };
}
