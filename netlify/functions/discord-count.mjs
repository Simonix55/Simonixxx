// Netlify Function (v2): Discord-Mitgliederzahl, erreichbar unter /api/discord-count.
// Antwort: { ok:true, members, online }  (so erwartet es die index.html)
// Weitere erlaubte Seiten: Netlify-Variable ALLOWED_ORIGINS (kommagetrennt).
const INVITE = "sHQKeuuS3k"; // https://discord.gg/sHQKeuuS3k

const origins = () => [
  "https://simonix55.github.io",
  ...String(process.env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim().replace(/\/$/, "")).filter(Boolean),
];

function cors(req) {
  const origin = (req.headers.get("origin") || "").replace(/\/$/, "");
  const h = { Vary: "Origin" };
  if (origin && origins().includes(origin)) {
    h["Access-Control-Allow-Origin"] = origin;
    h["Access-Control-Allow-Methods"] = "GET, OPTIONS";
    h["Access-Control-Allow-Headers"] = "Content-Type";
    h["Access-Control-Max-Age"] = "86400";
  }
  return h;
}

export default async (req) => {
  const c = cors(req);
  const json = (o, s = 200) =>
    new Response(JSON.stringify(o), {
      status: s,
      headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=60", ...c },
    });

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: c });
  if (req.method !== "GET") return json({ ok: false, error: "method" }, 405);

  try {
    const r = await fetch(`https://discord.com/api/v10/invites/${encodeURIComponent(INVITE)}?with_counts=true`, {
      headers: { Accept: "application/json" },
    });
    if (!r.ok) return json({ ok: false, error: "discord " + r.status }, 502);
    const j = await r.json();
    const members = Number(j.approximate_member_count);
    const online = Number(j.approximate_presence_count);
    if (!Number.isFinite(members)) return json({ ok: false, error: "format" }, 502);
    return json({ ok: true, members, online: Number.isFinite(online) ? online : null });
  } catch (e) {
    console.error("discord-count:", e);
    return json({ ok: false, error: "server" }, 502);
  }
};

export const config = { path: "/api/discord-count" };
