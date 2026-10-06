// Prüft ein Google-ID-Token (JWT) ohne Zusatzpakete und ohne Node-Module (nur WebCrypto):
// Signatur (RS256 gegen Googles öffentliche Schlüssel), Aussteller, Client-ID, Ablauf, bestätigte E-Mail.
// Läuft in Cloudflare Workers, Deno, Bun, Node 18+ und im Browser (z. B. für GitHub Pages).

const CERTS = "https://www.googleapis.com/oauth2/v3/certs";
const ISSUERS = ["accounts.google.com", "https://accounts.google.com"];
let cache = { at: 0, keys: null };

const enc = new TextEncoder();
const dec = new TextDecoder();

// base64url -> Bytes (ersetzt Buffer.from(..., "base64url"))
const b64 = (s) => {
  s = String(s).replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};
const fail = (reason) => Object.assign(new Error(reason), { reason });

async function loadKeys(fetchFn, now, force) {
  if (!force && cache.keys && now - cache.at < 60 * 60 * 1000) return cache.keys;
  let r;
  try { r = await fetchFn(CERTS); } catch { throw fail("certs"); }
  if (!r.ok) throw fail("certs");
  const j = await r.json().catch(() => null);
  if (!j) throw fail("certs");
  cache = { at: now, keys: j.keys || [] };
  return cache.keys;
}

export function resetCache() { cache = { at: 0, keys: null }; }

export async function verifyGoogleToken(token, clientId, { fetchFn = (...a) => fetch(...a), now = Date.now() } = {}) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) throw fail("format");
  let head, pay;
  try { head = JSON.parse(dec.decode(b64(parts[0]))); pay = JSON.parse(dec.decode(b64(parts[1]))); } catch { throw fail("format"); }
  if (!head || !pay || head.alg !== "RS256") throw fail("alg");

  let jwk = (await loadKeys(fetchFn, now, false)).find((k) => k.kid === head.kid);
  if (!jwk) jwk = (await loadKeys(fetchFn, now, true)).find((k) => k.kid === head.kid); // Schlüssel evtl. neu
  if (!jwk) throw fail("kid");

  let ok = false;
  try {
    const key = await crypto.subtle.importKey(
      "jwk",
      { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256", ext: true },
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"]
    );
    ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64(parts[2]), enc.encode(parts[0] + "." + parts[1]));
  } catch { ok = false; }
  if (!ok) throw fail("signature");

  if (!ISSUERS.includes(pay.iss)) throw fail("iss");
  if (!clientId || pay.aud !== clientId) throw fail("aud");
  if (!(Number(pay.exp) * 1000 > now)) throw fail("exp");
  if (!pay.sub || !pay.email || pay.email_verified !== true) throw fail("email");

  return {
    sub: String(pay.sub),
    email: String(pay.email).toLowerCase(),
    name: String(pay.name || String(pay.email).split("@")[0]).slice(0, 100),
    picture: String(pay.picture || ""),
  };
}
