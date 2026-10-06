// google-login.mjs – eigenständige Version ohne Netlify (keine ./lib-Dateien, kein @netlify/blobs).
// Läuft überall, wo es Web-Standard-fetch/Request/Response und WebCrypto gibt:
// Cloudflare Workers, Deno Deploy, Bun, Node 18+ (z. B. mit Deno.serve(worker.fetch)).
//
// Umgebungsvariablen (alle optional):
//   GOOGLE_CLIENT_ID  – überschreibt die eingebaute Client-ID
//   SESSION_SECRET    – geheimer Text zum Signieren des Sitzungs-Tokens (ohne ihn wird token = null)
//   ALLOWED_ORIGIN    – z. B. https://dein-name.github.io  (Standard: * = jede Seite darf anfragen)
//
// Aufruf von der GitHub-Pages-Seite aus:
//   GET  <URL>  -> { ok:true, clientId }
//   POST <URL>  mit { credential } -> { ok:true, token, user:{ email, name, picture } }

// Die Client-ID ist öffentlich (kein Geheimnis).
const DEFAULT_CLIENT_ID = "497100645111-rctq2u1p0pm75aebk871k30dr92l2960.apps.googleusercontent.com";
const CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const ISSUERS = ["https://accounts.google.com", "accounts.google.com"];
const SESSION_DAYS = 30;

/* ---------- Hilfsfunktionen ---------- */
const enc = new TextEncoder();
const dec = new TextDecoder();

const b64uToBytes = (s) => {
  s = String(s).replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};
const bytesToB64u = (bytes) => {
  let bin = "";
  for (const b of new Uint8Array(bytes)) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const fail = (reason) => Object.assign(new Error(reason), { reason });

const getEnv = (env, key) => {
  const v = (env && env[key]) ?? (typeof process !== "undefined" && process.env ? process.env[key] : undefined);
  return (v || "").toString().trim();
};

/* ---------- Google-Token prüfen ---------- */
let certCache = { keys: null, until: 0 };

async function getCerts() {
  if (certCache.keys && Date.now() < certCache.until) return certCache.keys;
  let res;
  try { res = await fetch(CERTS_URL); } catch { throw fail("certs"); }
  if (!res.ok) throw fail("certs");
  const data = await res.json().catch(() => null);
  if (!data || !Array.isArray(data.keys)) throw fail("certs");
  const m = /max-age=(\d+)/.exec(res.headers.get("cache-control") || "");
  certCache = { keys: data.keys, until: Date.now() + (m ? Number(m[1]) : 3600) * 1000 };
  return data.keys;
}

export async function verifyGoogleToken(credential, clientId) {
  if (typeof credential !== "string") throw fail("format");
  const parts = credential.split(".");
  if (parts.length !== 3) throw fail("format");

  let header, payload;
  try {
    header = JSON.parse(dec.decode(b64uToBytes(parts[0])));
    payload = JSON.parse(dec.decode(b64uToBytes(parts[1])));
  } catch { throw fail("format"); }
  if (header.alg !== "RS256") throw fail("alg");

  const jwk = (await getCerts()).find((k) => k.kid === header.kid);
  if (!jwk) throw fail("kid");

  const key = await crypto.subtle.importKey(
    "jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]
  );
  const ok = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5", key, b64uToBytes(parts[2]), enc.encode(parts[0] + "." + parts[1])
  );
  if (!ok) throw fail("signature");

  const now = Math.floor(Date.now() / 1000);
  if (!ISSUERS.includes(payload.iss)) throw fail("iss");
  if (payload.aud !== clientId) throw fail("aud");
  if (!payload.exp || payload.exp < now - 60) throw fail("expired");
  if (payload.nbf && payload.nbf > now + 60) throw fail("nbf");
  if (!payload.email || payload.email_verified === false) throw fail("email");

  return {
    email: String(payload.email).toLowerCase(),
    name: payload.name || payload.given_name || String(payload.email).split("@")[0],
    picture: payload.picture || "",
  };
}

/* ---------- Sitzungs-Token (HMAC-SHA256) ---------- */
export async function signSession(secret, email) {
  const body = bytesToB64u(enc.encode(JSON.stringify({
    e: email,
    exp: Math.floor(Date.now() / 1000) + SESSION_DAYS * 86400,
  })));
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  return body + "." + bytesToB64u(sig);
}

/* ---------- Handler ---------- */
export async function handler(req, env) {
  const origin = getEnv(env, "ALLOWED_ORIGIN") || "*";
  const cors = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
  const json = (o, s = 200) =>
    new Response(JSON.stringify(o), {
      status: s,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...cors },
    });

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

  const id = getEnv(env, "GOOGLE_CLIENT_ID") || DEFAULT_CLIENT_ID;

  // GET: liefert die (öffentliche) Client-ID, dient auch als Gesundheitscheck.
  if (req.method === "GET") return json({ ok: true, clientId: id });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  let body;
  try { body = await req.json(); } catch { return json({ error: "json" }, 400); }

  try {
    const user = await verifyGoogleToken(body && body.credential, id);
    let token = null;
    const secret = getEnv(env, "SESSION_SECRET");
    if (secret) {
      try { token = await signSession(secret, user.email); }
      catch (e) { console.error("Sitzung konnte nicht erstellt werden:", e); }
    }
    return json({ ok: true, token, user });
  } catch (e) {
    if (e && e.reason === "certs") { console.error("Google-Schlüssel nicht abrufbar"); return json({ error: "server" }, 502); }
    console.warn("Google-Token abgelehnt:", e && e.reason ? e.reason : e);
    return json({ error: "token" }, 401);
  }
}

// Cloudflare Workers / Deno / Bun: export default { fetch }
export default { fetch: (req, env) => handler(req, env) };
