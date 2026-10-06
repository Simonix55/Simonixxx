import { getCounts } from "./lib/discord.mjs";
import { withCors } from "./lib/cors.mjs";

const json = (o, s = 200) =>
  new Response(JSON.stringify(o), {
    status: s,
    headers: { "Content-Type": "application/json", "Cache-Control": s === 200 ? "public, max-age=60" : "no-store" },
  });

export default withCors(async () => {
  try {
    return json({ ok: true, ...(await getCounts()) });
  } catch (e) {
    console.warn("Discord-Zahl nicht abrufbar:", e && e.status ? e.status : e);
    return json({ ok: false, error: "discord", status: (e && e.status) || 0 }, 502);
  }
});

export const config = { path: "/api/discord-count" };
