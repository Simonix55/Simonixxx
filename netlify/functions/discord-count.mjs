// Mitgliederzahl direkt im Browser (GitHub Pages, kein Netlify nötig).
// Einbinden in index.html:  <script type="module" src="discord-count.mjs"></script>
// Und im Text die ID setzen:  <span id="discord-count">…</span>
const INVITE = "sHQKeuuS3k"; // https://discord.gg/sHQKeuuS3k

const el = document.getElementById("discord-count");

async function load() {
  const r = await fetch(`https://discord.com/api/v10/invites/${encodeURIComponent(INVITE)}?with_counts=true`, {
    headers: { Accept: "application/json" },
  });
  if (!r.ok) throw new Error("discord " + r.status);
  const j = await r.json();
  const members = Number(j.approximate_member_count);
  const online = Number(j.approximate_presence_count);
  if (!Number.isFinite(members)) throw new Error("format");
  const nf = new Intl.NumberFormat("de-DE");
  return nf.format(members) + " Mitglieder" + (Number.isFinite(online) ? " · " + nf.format(online) + " online" : "");
}

if (el) {
  load()
    .then((text) => { el.textContent = text; })
    .catch((e) => { console.warn("Discord-Zahl nicht abrufbar:", e); el.textContent = "Mitgliederzahl gerade nicht verfügbar"; });
}
