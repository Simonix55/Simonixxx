import assert from "node:assert/strict";
import { corsHeaders, withCors } from "../netlify/functions/lib/cors.mjs";

const h = corsHeaders("https://simonix55.github.io", {});
assert.equal(h["Access-Control-Allow-Origin"], "https://simonix55.github.io");
assert.equal(corsHeaders("https://boese.example", {})["Access-Control-Allow-Origin"], undefined);
assert.equal(corsHeaders("https://meine-domain.de", { ALLOWED_ORIGINS: "https://meine-domain.de/" })["Access-Control-Allow-Origin"], "https://meine-domain.de");

const f = withCors(async () => new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } }));
const pre = await f(new Request("https://x.test/api/a", { method: "OPTIONS", headers: { origin: "https://simonix55.github.io" } }));
assert.equal(pre.status, 204);
assert.equal(pre.headers.get("access-control-allow-origin"), "https://simonix55.github.io");
const res = await f(new Request("https://x.test/api/a", { method: "POST", headers: { origin: "https://simonix55.github.io" } }));
assert.equal(res.status, 200);
assert.equal(res.headers.get("content-type"), "application/json");
assert.equal(res.headers.get("access-control-allow-origin"), "https://simonix55.github.io");
const bad = await f(new Request("https://x.test/api/a", { method: "POST", headers: { origin: "https://boese.example" } }));
assert.equal(bad.headers.get("access-control-allow-origin"), null);
console.log("cors ok");
