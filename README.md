# The AgentSuper App

Die Website liegt auf **GitHub Pages**, die Funktionen (E-Mail-Code, Google-Login, KI-Chat, Discord-Chat und -Zähler, neuestes YouTube-Video) laufen weiter auf **Netlify**. Beide kommen aus diesem einen Repository.

- Website: `https://simonix55.github.io/REPO-NAME/`
- Funktionen: `https://agentsuper.netlify.app/api/...`

## Ordner
- `index.html` – die Website (im Hauptordner, damit GitHub Pages sie findet)
- `netlify/functions/` – die Server-Funktionen
- `netlify/functions/lib/cors.mjs` – erlaubt Anfragen von der GitHub-Seite an Netlify
- `tests/` – Tests (`npm test`)
- `.nojekyll` – GitHub Pages liefert die Dateien unverändert aus

## Einrichtung
1. **GitHub Pages:** Repo → Settings → Pages → „Deploy from a branch" → `main` / `/ (root)`.
2. **Netlify mit dem Repo verbinden:** Add new site → Import from Git → dieses Repo. Build-Einstellungen kommen aus `netlify.toml`. Die Netlify-Adresse muss `agentsuper.netlify.app` heißen, sonst oben in `index.html` die Zeile mit `window.API_BASE` anpassen.
3. **Netlify-Variablen** (Site configuration → Environment variables, Scope **Functions**):
   - `RESEND_API_KEY` – E-Mail-Code (Pflicht für den Code-Versand)
   - `DISCORD_WEBHOOK_URL` – Webhook für den Chat nach Discord (**nie in den Code schreiben**)
   - `ANTHROPIC_API_KEY` – KI-Chat (optional), dazu `AI_DAILY_LIMIT`, `AI_MODEL`
   - `GOOGLE_CLIENT_ID` – Google-Login (optional). In der Google Cloud Console unter „Autorisierte JavaScript-Quellen" **`https://simonix55.github.io`** eintragen.
   - `MAIL_FROM`, `CODE_SECRET` – optional
   - `ALLOWED_ORIGINS` – optional, weitere erlaubte Seiten-Adressen (kommagetrennt), z. B. eine eigene Domain. `https://simonix55.github.io` ist schon erlaubt.
4. Nach dem Setzen von Variablen auf Netlify neu deployen.

## Sicherheit
Das Repository ist öffentlich. Hier dürfen keine Schlüssel, Webhooks oder Passwörter stehen, nur in den Netlify-Variablen.

## Fehlersuche
Auf der Website oben auf die Statusleiste klicken („Details"). Dort steht, welche Funktion nicht erreichbar ist. Hilft das nicht: Netlify → Logs → Functions.
